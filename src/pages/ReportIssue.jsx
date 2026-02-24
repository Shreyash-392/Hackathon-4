import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Camera, MapPin, Navigation, Send, Copy, CheckCircle, Loader2, Shield, AlertTriangle, Building2, Clock, MessageSquare, Lightbulb, X, Mic } from 'lucide-react'
import './ReportIssue.css'
import { apiFetch } from '../components/api'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const CATEGORIES = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Safety', 'Drainage', 'Streetlights', 'Parks', 'Other']
const REASSURANCE_TEXTS = [
    "Your identity is completely anonymous...",
    "Analyzing the issue with AI...",
    "Routing to the right department...",
    "Almost there, hang tight...",
    "Your voice matters. Processing..."
]

// Authority details based on area type
function getAuthorityDetails(city, district, state) {
    if (!city && !district && !state) return null
    const cityLower = (city || '').toLowerCase()
    const isMetro = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'surat', 'nagpur', 'indore', 'bhopal', 'patna', 'chandigarh', 'noida', 'gurgaon', 'gurugram'].some(m => cityLower.includes(m))
    const isTown = ['nagar', 'pur', 'bad', 'ganj', 'garh'].some(s => cityLower.endsWith(s)) || cityLower.length > 0

    if (isMetro) {
        return {
            type: 'Municipal Corporation',
            office: `${city || district} Municipal Corporation`,
            head: 'Municipal Commissioner',
            body: 'Elected City Council (Nagarsevaks / Corporators)',
            jurisdiction: `${city || 'City'}, ${district ? district + ',' : ''} ${state || ''}`.replace(/,\s*$/, ''),
            helpline: '1800-XXX-XXXX (Toll Free)',
        }
    } else if (isTown && city) {
        return {
            type: 'Municipal Council / Nagar Palika',
            office: `${city} Nagar Palika / Municipal Council`,
            head: 'Chief Municipal Officer (CMO)',
            body: 'Elected Municipal Councillors',
            jurisdiction: `${city}, ${district ? district + ',' : ''} ${state || ''}`.replace(/,\s*$/, ''),
            helpline: 'Contact District Collector Office',
        }
    } else if (district || state) {
        return {
            type: 'Gram Panchayat / Block Development Office',
            office: `${district || state} Zila Panchayat / Block Development Office`,
            head: 'Block Development Officer (BDO)',
            body: 'Elected Gram Panchayat Members (Sarpanch & Panches)',
            jurisdiction: `${city ? city + ',' : ''} ${district || ''}, ${state || ''}`.replace(/,\s*$/, ''),
            helpline: 'Contact Block Development Office',
        }
    }
    return null
}

// Reverse geocode using Nominatim (OpenStreetMap)
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`)
        const data = await res.json()
        if (data && data.address) {
            const a = data.address
            return {
                state: a.state || '',
                district: a.state_district || a.county || '',
                city: a.city || a.town || a.village || a.suburb || '',
                pincode: a.postcode || '',
                landmark: a.road || a.neighbourhood || '',
            }
        }
    } catch { }
    return null
}

// Forward geocode — search location text to get lat/lng
async function forwardGeocode(query) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`)
        const data = await res.json()
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        }
    } catch { }
    return null
}


function MapClickHandler({ onMapClick }) {
    useMapEvents({ click: (e) => onMapClick(e.latlng) })
    return null
}

function MapCenterUpdater({ center, zoom }) {
    const map = useMap()
    useEffect(() => {
        if (center) map.flyTo(center, zoom || map.getZoom(), { duration: 0.8 })
    }, [center, zoom, map])
    return null
}

export default function ReportIssue() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '', description: '', category: 'Roads', priority: 'medium',
        state: '', district: '', city: '', landmark: '', pincode: '',
        lat: 22.5937, lng: 78.9629 // India center
    })
    const [mapZoom, setMapZoom] = useState(5)
    const [photo, setPhoto] = useState(null)
    const [photoPreview, setPhotoPreview] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [result, setResult] = useState(null)
    const [aiAnalysis, setAiAnalysis] = useState(null)
    const [loadingAI, setLoadingAI] = useState(false)
    const [reassuranceIdx, setReassuranceIdx] = useState(0)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [copiedIdx, setCopiedIdx] = useState(-1)
    const [geocoding, setGeocoding] = useState(false)
    const fileRef = useRef(null)
    const geocodeTimerRef = useRef(null)

    // Reassurance text rotation during loading
    useEffect(() => {
        if (!submitting && !loadingAI) return
        const interval = setInterval(() => {
            setReassuranceIdx(prev => (prev + 1) % REASSURANCE_TEXTS.length)
        }, 2500)
        return () => clearInterval(interval)
    }, [submitting, loadingAI])

    // Real-time geocoding when location fields change
    const triggerGeocode = useCallback((city, district, state, pincode) => {
        if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
        const query = [city, district, state, pincode].filter(Boolean).join(', ')
        if (!query || query.length < 3) return

        geocodeTimerRef.current = setTimeout(async () => {
            setGeocoding(true)
            const result = await forwardGeocode(query + ', India')
            if (result) {
                setForm(f => ({ ...f, lat: result.lat, lng: result.lng }))
                setMapZoom(city ? 14 : district ? 10 : 7)
            }
            setGeocoding(false)
        }, 800) // debounce 800ms
    }, [])

    const handleListen = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert("Your browser doesn't support speech to text.")
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => setIsListening(true)
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setForm(f => ({ ...f, description: f.description ? f.description + ' ' + transcript : transcript }))
        }
        recognition.onerror = (e) => {
            console.error(e)
            setIsListening(false)
        }
        recognition.onend = () => setIsListening(false)

        recognition.start()
    }

    const updateField = (field, value) => {
        setForm(f => {
            const updated = { ...f, [field]: value }
            // Trigger geocode on city/district/state/pincode changes
            if (['city', 'district', 'state', 'pincode'].includes(field)) {
                triggerGeocode(
                    field === 'city' ? value : updated.city,
                    field === 'district' ? value : updated.district,
                    field === 'state' ? value : updated.state,
                    field === 'pincode' ? value : updated.pincode
                )
            }
            return updated
        })
    }

    const handleGPS = async () => {
        if (!navigator.geolocation) return alert('Geolocation not supported')
        setGpsLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude
                const lng = pos.coords.longitude
                setForm(f => ({ ...f, lat, lng }))
                setMapZoom(15)

                // Reverse geocode to auto-fill fields
                const addr = await reverseGeocode(lat, lng)
                if (addr) {
                    setForm(f => ({
                        ...f, lat, lng,
                        state: addr.state,
                        district: addr.district,
                        city: addr.city,
                        pincode: addr.pincode,
                        landmark: addr.landmark,
                    }))
                }
                setGpsLoading(false)
            },
            () => { setGpsLoading(false); alert('Location access denied. Please allow location or place the pin manually.') },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handlePhoto = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setPhoto(file)
        setPhotoPreview(URL.createObjectURL(file))
    }

    const handleMapClick = async (latlng) => {
        setForm(f => ({ ...f, lat: latlng.lat, lng: latlng.lng }))
        // Reverse geocode on map click too
        const addr = await reverseGeocode(latlng.lat, latlng.lng)
        if (addr) {
            setForm(f => ({
                ...f, lat: latlng.lat, lng: latlng.lng,
                state: addr.state,
                district: addr.district,
                city: addr.city,
                pincode: addr.pincode,
                landmark: addr.landmark,
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!photo) return alert('Photo is mandatory! Please upload a photo of the issue.')

        setSubmitting(true)
        setReassuranceIdx(0)

        try {
            const formData = new FormData()
            Object.entries(form).forEach(([k, v]) => formData.append(k, v))
            formData.append('address', `${form.landmark}, ${form.city}, ${form.district}, ${form.state} - ${form.pincode}`.replace(/(^,\s*|,\s*$)/g, ''))
            formData.append('photo', photo)

            const res = await apiFetch('/api/complaints', { method: 'POST', body: formData })
            const data = await res.json()

            if (data.success) {
                setResult(data)
                setSubmitting(false)

                // Add points to wallet
                let userId = localStorage.getItem('userId');
                if (!userId) {
                    userId = 'user-' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('userId', userId);
                }
                try {
                    await apiFetch('/api/user/wallet/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, points: 50 })
                    })
                    window.dispatchEvent(new Event('walletUpdated'))
                } catch (e) { console.error('Wallet error', e) }

                // Run AI analysis (optional, can be kept or skipped for instant redirect)
                // setLoadingAI(true)
                // ... (AI analysis code can be kept if you want to show the result before redirect)
                // setLoadingAI(false)

                // Redirect to Community page after short delay for better UX
                setTimeout(() => {
                    navigate('/community');
                }, 1200); // 1.2s delay to show success message
            }
        } catch (err) {
            alert('Failed to submit. Please try again.')
        }
        setSubmitting(false)
    }

    const copyText = (text, idx) => {
        navigator.clipboard.writeText(text)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(-1), 2000)
    }

    if (result) {
        return (
            <div className="page report-page">
                <div className="container">
                    <div className="success-section animate-fade-in-up">
                        <div className="success-card glass-card">
                            <div className="success-icon">
                                <CheckCircle size={56} />
                            </div>
                            <h2>Complaint Registered Successfully!</h2>
                            <p className="success-subtitle">Your voice has been heard. Here's your tracking ID:</p>
                            <div className="tracking-id-box">
                                <span className="tracking-id">{result.trackingId}</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => copyText(result.trackingId, -2)}>
                                    {copiedIdx === -2 ? <CheckCircle size={14} /> : <Copy size={14} />}
                                    {copiedIdx === -2 ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <div className="wallet-reward-banner mt-3" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                                <span>🎉</span>
                                <span>You earned 50 Reward Points for reporting this issue!</span>
                            </div>
                            <p className="tracking-note">Save this ID to track your complaint status anytime.</p>
                            <div className="anonymity-banner mt-3">
                                <Shield size={16} />
                                <span>Your identity remains completely anonymous.</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    {loadingAI && (
                        <div className="ai-loading glass-card animate-fade-in-up">
                            <Loader2 size={32} className="spinner" />
                            <p className="loading-text">{REASSURANCE_TEXTS[reassuranceIdx]}</p>
                        </div>
                    )}

                    {aiAnalysis && (
                        <div className="ai-results animate-fade-in-up">
                            <h3 className="ai-title">
                                <Lightbulb size={22} />
                                AI Analysis Report
                            </h3>

                            <div className="ai-grid">
                                <div className="ai-card glass-card animate-fade-in-up stagger-1">
                                    <div className="ai-card-header">
                                        <AlertTriangle size={20} />
                                        <h4>Severity Assessment</h4>
                                    </div>
                                    <div className="severity-badge" data-severity={aiAnalysis.severity?.toLowerCase()}>
                                        {aiAnalysis.severity} — Score: {aiAnalysis.severityScore}/10
                                    </div>
                                    <p>{aiAnalysis.analysis}</p>
                                </div>

                                <div className="ai-card glass-card animate-fade-in-up stagger-2">
                                    <div className="ai-card-header">
                                        <Building2 size={20} />
                                        <h4>Department Routing</h4>
                                    </div>
                                    <div className="department-name">{aiAnalysis.department}</div>
                                    <div className="ai-card-header mt-2">
                                        <Clock size={20} />
                                        <h4>Est. Resolution</h4>
                                    </div>
                                    <p>{aiAnalysis.estimatedResolution}</p>
                                </div>

                                <div className="ai-card glass-card full-width animate-fade-in-up stagger-3">
                                    <div className="ai-card-header">
                                        <MessageSquare size={20} />
                                        <h4>Suggested Responses</h4>
                                    </div>
                                    <p className="response-hint">Use these to follow up with authorities:</p>
                                    <div className="suggested-responses">
                                        {aiAnalysis.suggestedResponses?.map((resp, i) => (
                                            <div key={i} className="response-card glass-card">
                                                <p>{resp}</p>
                                                <button className="btn btn-secondary btn-sm" onClick={() => copyText(resp, i)}>
                                                    {copiedIdx === i ? <CheckCircle size={14} /> : <Copy size={14} />}
                                                    {copiedIdx === i ? 'Copied!' : 'Copy'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {aiAnalysis.recommendations && (
                                    <div className="ai-card glass-card full-width animate-fade-in-up stagger-4">
                                        <div className="ai-card-header">
                                            <Lightbulb size={20} />
                                            <h4>Recommendations</h4>
                                        </div>
                                        <ul className="recommendations-list">
                                            {aiAnalysis.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="page report-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Report a Civic Issue</h1>
                    <p className="page-subtitle">Help improve your community by reporting issues anonymously</p>
                    <div className="anonymity-banner mt-2">
                        <Shield size={16} />
                        <span>Your identity is completely anonymous. You can share freely and safely.</span>
                    </div>
                </div>

                {submitting && (
                    <div className="loading-overlay">
                        <div className="loading-content glass-card">
                            <Loader2 size={48} className="spinner" />
                            <p className="loading-text">{REASSURANCE_TEXTS[reassuranceIdx]}</p>
                        </div>
                    </div>
                )}

                <form className="report-form" onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* Left Column */}
                        <div className="form-column">
                            <div className="form-section glass-card">
                                <h3 className="form-section-title">Issue Details</h3>
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input className="form-input" placeholder="e.g., Large pothole on main road" value={form.title} onChange={e => updateField('title', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description *</label>
                                    <div className="textarea-wrapper">
                                        <textarea className="form-textarea" placeholder="Describe the issue in detail..." value={form.description} onChange={e => updateField('description', e.target.value)} required />
                                        <button type="button" className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={handleListen} title="Voice dictate">
                                            <Mic size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Category *</label>
                                        <select className="form-select" value={form.category} onChange={e => updateField('category', e.target.value)}>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Priority *</label>
                                        <div className="priority-selector">
                                            {['low', 'medium', 'high'].map(p => (
                                                <button type="button" key={p} className={`priority-btn ${form.priority === p ? 'active' : ''} priority-${p}`}
                                                    onClick={() => updateField('priority', p)}>
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Photo Upload */}
                            <div className="form-section glass-card">
                                <h3 className="form-section-title">Photo Evidence *</h3>
                                <div className={`photo-upload ${photoPreview ? 'has-photo' : ''}`} onClick={() => fileRef.current?.click()}>
                                    {photoPreview ? (
                                        <div className="photo-preview-wrapper">
                                            <img src={photoPreview} alt="Preview" className="photo-preview" />
                                            <button type="button" className="photo-remove" onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPreview(null) }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="photo-placeholder">
                                            <Camera size={40} />
                                            <p>Click to upload photo</p>
                                            <span>Mandatory — take a clear photo of the issue</span>
                                        </div>
                                    )}
                                    <input type="file" ref={fileRef} accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column — Location */}
                        <div className="form-column">
                            <div className="form-section glass-card">
                                <h3 className="form-section-title">Location</h3>
                                <button type="button" className="btn btn-secondary gps-btn" onClick={handleGPS} disabled={gpsLoading}>
                                    {gpsLoading ? <Loader2 size={16} className="spinner" /> : <Navigation size={16} />}
                                    {gpsLoading ? 'Detecting & Auto-filling...' : 'Auto-Detect GPS Location'}
                                </button>

                                <div className="map-container">
                                    <MapContainer center={[form.lat, form.lng]} zoom={mapZoom} style={{ height: '300px', width: '100%' }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                                        <Marker position={[form.lat, form.lng]} />
                                        <MapClickHandler onMapClick={handleMapClick} />
                                        <MapCenterUpdater center={[form.lat, form.lng]} zoom={mapZoom} />
                                    </MapContainer>
                                    {geocoding && <div className="geocoding-indicator"><Loader2 size={14} className="spinner" /> Finding location...</div>}
                                </div>
                                <p className="map-hint"><MapPin size={14} /> Click on the map or type address below — pin moves in real-time</p>

                                <div className="location-fields">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">State</label>
                                            <input className="form-input" placeholder="State" value={form.state} onChange={e => updateField('state', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">District</label>
                                            <input className="form-input" placeholder="District" value={form.district} onChange={e => updateField('district', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">City / Village</label>
                                            <input className="form-input" placeholder="City or Village" value={form.city} onChange={e => updateField('city', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Pincode</label>
                                            <input className="form-input" placeholder="e.g., 400001" value={form.pincode} onChange={e => updateField('pincode', e.target.value)} maxLength={6} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Landmark / Road</label>
                                        <input className="form-input" placeholder="Near landmark or road" value={form.landmark} onChange={e => updateField('landmark', e.target.value)} />
                                    </div>
                                </div>

                                <div className="coords-display">
                                    <span>📍 Lat: {form.lat.toFixed(6)}</span>
                                    <span>Lng: {form.lng.toFixed(6)}</span>
                                </div>

                                {/* Authority Details */}
                                {getAuthorityDetails(form.city, form.district, form.state) && (
                                    <div className="authority-card animate-fade-in-up">
                                        <div className="authority-header">
                                            <Building2 size={18} />
                                            <h4>Concerned Authority</h4>
                                        </div>
                                        <div className="authority-details">
                                            {(() => {
                                                const auth = getAuthorityDetails(form.city, form.district, form.state)
                                                return (
                                                    <>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Type</span>
                                                            <span className="authority-value authority-type-badge">{auth.type}</span>
                                                        </div>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Office</span>
                                                            <span className="authority-value">{auth.office}</span>
                                                        </div>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Head</span>
                                                            <span className="authority-value">{auth.head}</span>
                                                        </div>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Body</span>
                                                            <span className="authority-value">{auth.body}</span>
                                                        </div>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Area</span>
                                                            <span className="authority-value">{auth.jurisdiction}</span>
                                                        </div>
                                                        <div className="authority-row">
                                                            <span className="authority-label">Helpline</span>
                                                            <span className="authority-value">{auth.helpline}</span>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="form-submit">
                        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                            <Send size={20} />
                            Submit Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
