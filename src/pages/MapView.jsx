import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { Filter, MapPin, AlertTriangle, ThumbsUp } from 'lucide-react'
import './MapView.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' }

function getIcon(priority) {
    const color = priorityColors[priority] || '#6366f1'
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    })
}

export default function MapView() {
    const [complaints, setComplaints] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        const params = filter !== 'all' ? `?category=${filter}` : ''
        fetch(`/api/complaints${params}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) setComplaints(data.complaints.filter(c => c.location?.lat && c.location?.lng))
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [filter])

    return (
        <div className="page map-page">
            <div className="map-wrapper">
                {/* Filter overlay */}
                <div className="map-filters glass">
                    <Filter size={16} />
                    <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
                        <option value="all">All Categories</option>
                        {['Roads', 'Water', 'Electricity', 'Sanitation', 'Safety', 'Drainage', 'Streetlights', 'Parks', 'Other'].map(c =>
                            <option key={c} value={c}>{c}</option>
                        )}
                    </select>
                    <div className="map-legend">
                        <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span> High</span>
                        <span className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span> Medium</span>
                        <span className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span> Low</span>
                    </div>
                </div>

                <div className="map-stats glass">
                    <MapPin size={16} />
                    <span>{complaints.length} issues on map</span>
                </div>

                <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                    />
                    {complaints.map(c => (
                        <Marker key={c.id} position={[c.location.lat, c.location.lng]} icon={getIcon(c.priority)}>
                            <Popup>
                                <div className="map-popup">
                                    <h4>{c.title}</h4>
                                    <div className="popup-badges">
                                        <span className={`popup-badge priority-${c.priority}`}>{c.priority}</span>
                                        <span className="popup-badge category">{c.category}</span>
                                        <span className={`popup-badge status-${c.status}`}>{c.status}</span>
                                    </div>
                                    <p>{c.description?.substring(0, 100)}...</p>
                                    {c.photo && <img src={c.photo} alt="" className="popup-photo" />}
                                    <div className="popup-footer">
                                        <span><ThumbsUp size={12} /> {c.votes} votes</span>
                                        <span>{c.trackingId}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    )
}
