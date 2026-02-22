import { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import { Search, MapPin, Navigation, Clock, Activity, AlertTriangle } from 'lucide-react'
import L from 'leaflet'
import { apiFetch } from '../components/api'
import './SmartRoute.css'

// Custom marker icons
const createIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const sourceIcon = createIcon('green');
const destIcon = createIcon('red');
const alertIcon = createIcon('orange');

// Component to handle map view fitting
function MapAutoFit({ routeCoords }) {
    const map = useMap();
    useEffect(() => {
        if (routeCoords && routeCoords.length > 0) {
            const bounds = L.latLngBounds(routeCoords);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [routeCoords, map]);
    return null;
}

export default function SmartRoute() {
    const [source, setSource] = useState('')
    const [destination, setDestination] = useState('')
    const [routeData, setRouteData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [activeComplaints, setActiveComplaints] = useState([])

    // Indian center default
    const defaultCenter = [20.5937, 78.9629]
    const defaultZoom = 5

    useEffect(() => {
        // Fetch active complaints to show them on the map as alerts
        apiFetch('/api/complaints')
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const active = data.complaints.filter(c => c.status !== 'resolved' && c.location?.lat && c.location?.lng)
                    setActiveComplaints(active)
                }
            })
            .catch(() => { })
    }, [])

    const geocode = async (query) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in`)
        const data = await res.json()
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name }
        }
        return null;
    }

    const calculateRoute = async (e) => {
        e.preventDefault()
        if (!source || !destination) return

        setLoading(true)
        setError('')
        setRouteData(null)

        try {
            const sourcePoint = await geocode(source)
            const destPoint = await geocode(destination)

            if (!sourcePoint) throw new Error("Could not find start location.")
            if (!destPoint) throw new Error("Could not find destination.")

            // OSRM routing API (driving profile)
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourcePoint.lng},${sourcePoint.lat};${destPoint.lng},${destPoint.lat}?overview=full&geometries=geojson`

            const routeRes = await fetch(osrmUrl)
            const routeJson = await routeRes.json()

            if (routeJson.code !== 'Ok') {
                throw new Error("Could not calculate a route between these points.")
            }

            const route = routeJson.routes[0]

            // OSRM returns coordinates in [lng, lat], leaflet needs [lat, lng]
            const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]])

            const distanceKm = (route.distance / 1000).toFixed(1)
            const durationMin = Math.ceil(route.duration / 60)

            setRouteData({
                source: sourcePoint,
                destination: destPoint,
                coordinates: coords,
                distance: distanceKm,
                duration: durationMin
            })

            // Trigger wallet update for using the smart route feature
            try {
                await apiFetch('/api/user/wallet/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ points: 10 }) // 10 points for using the Smart Route
                })
                window.dispatchEvent(new Event('walletUpdated'))
            } catch (err) { console.error("Wallet error", err) }

        } catch (err) {
            setError(err.message || "Failed to calculate route.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page route-page">
            <div className="container">
                <div className="page-header text-center animate-fade-in-up">
                    <h1 className="page-title"><Navigation className="inline-icon" /> Smart Commute</h1>
                    <p className="page-subtitle">Find the fastest route using real-life data. Earn +10 Pts per route calculation!</p>
                </div>

                <div className="route-grid">
                    {/* Left Panel - Inputs & Stats */}
                    <div className="route-panel animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        <div className="glass-card" style={{ padding: '24px' }}>
                            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={20} color="var(--accent-primary)" /> Plan Your Route
                            </h3>

                            <form onSubmit={calculateRoute} className="route-form">
                                <div className="form-group">
                                    <label>Start Location</label>
                                    <div className="input-with-icon">
                                        <Search size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Andheri Station, Mumbai"
                                            value={source}
                                            onChange={e => setSource(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Destination</label>
                                    <div className="input-with-icon">
                                        <Search size={18} className="input-icon" />
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. Bandra Kurla Complex, Mumbai"
                                            value={destination}
                                            onChange={e => setDestination(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {error && <div className="route-error"><AlertTriangle size={16} /> {error}</div>}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                    {loading ? 'Calculating...' : 'Find Fastest Route'}
                                </button>
                            </form>
                        </div>

                        {routeData && (
                            <div className="glass-card route-stats animate-fade-in-up" style={{ padding: '24px', marginTop: '20px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                <h3 style={{ marginBottom: '20px', color: '#ca8a04', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={20} /> Trip Overview
                                </h3>
                                <div className="stat-grid">
                                    <div className="r-stat">
                                        <Clock size={24} style={{ color: 'var(--accent-primary)' }} />
                                        <div className="r-stat-val">{routeData.duration > 60 ? `${Math.floor(routeData.duration / 60)}h ${routeData.duration % 60}m` : `${routeData.duration} min`}</div>
                                        <div className="r-stat-label">Est. Time</div>
                                    </div>
                                    <div className="r-stat">
                                        <Navigation size={24} style={{ color: 'var(--accent-success)' }} />
                                        <div className="r-stat-val">{routeData.distance} km</div>
                                        <div className="r-stat-label">Distance</div>
                                    </div>
                                </div>

                                <div className="wallet-reward-banner mt-3" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                                    <span>🎉</span>
                                    <span>Route calculated! +10 Points added to your wallet.</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Panel - Map */}
                    <div className="route-map-container glass-card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />

                            {/* Render Active Complaints as obstacles/alerts */}
                            {activeComplaints.map(c => (
                                <Marker key={c.id} position={[c.location.lat, c.location.lng]} icon={alertIcon}>
                                    <Popup>
                                        <strong>⚠️ {c.category} Issue</strong><br />
                                        {c.title}<br />
                                        <span style={{ color: 'var(--accent-danger)' }}>Avoid this area if possible.</span>
                                    </Popup>
                                </Marker>
                            ))}

                            {/* Render the Route */}
                            {routeData && (
                                <>
                                    <Marker position={[routeData.source.lat, routeData.source.lng]} icon={sourceIcon}>
                                        <Popup><strong>Start:</strong> {source}</Popup>
                                    </Marker>

                                    <Marker position={[routeData.destination.lat, routeData.destination.lng]} icon={destIcon}>
                                        <Popup><strong>End:</strong> {destination}</Popup>
                                    </Marker>

                                    <Polyline
                                        positions={routeData.coordinates}
                                        color="#3B82F6"
                                        weight={5}
                                        opacity={0.8}
                                    />

                                    <MapAutoFit routeCoords={routeData.coordinates} />
                                </>
                            )}
                        </MapContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
