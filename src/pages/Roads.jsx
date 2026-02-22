import { useState, useEffect } from 'react'
import { HardHat, CheckCircle, Clock, Calendar, DollarSign, MapPin, Building2 } from 'lucide-react'
import { apiFetch } from '../components/api'   // ✅ ADDED
import './Roads.css'

export default function Roads() {
    const [roads, setRoads] = useState([])
    const [activeTab, setActiveTab] = useState('all')
    const [selectedState, setSelectedState] = useState('All States')
    const [loading, setLoading] = useState(true)

    const availableStates = ['All States', ...new Set(roads.filter(r => r.state).map(r => r.state))]
    const displayedRoads = roads.filter(r => selectedState === 'All States' || r.state === selectedState)

    useEffect(() => {
        const fetchRoads = async () => {
            setLoading(true)
            const params = activeTab !== 'all' ? `?status=${activeTab}` : ''

            try {
                const res = await apiFetch(`/api/complaints/roads/list${params}`)   // ✅ CHANGED
                const data = await res.json()
                if (data.success) setRoads(data.roads)
            } catch (err) {
                console.error("Fetch roads error:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchRoads()
    }, [activeTab])

    const tabs = [
        { key: 'all', label: 'All Projects' },
        { key: 'sanctioned', label: 'Sanctioned' },
        { key: 'ongoing', label: 'Ongoing' },
        { key: 'completed', label: 'Completed' },
    ]

    const statusConfig = {
        sanctioned: { color: 'var(--accent-warning)', icon: Clock, label: 'Sanctioned' },
        ongoing: { color: 'var(--accent-primary)', icon: HardHat, label: 'Ongoing' },
        completed: { color: 'var(--accent-success)', icon: CheckCircle, label: 'Completed' },
    }

    return (
        <div className="page roads-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Road Projects</h1>
                    <p className="page-subtitle">
                        Track sanctioned, ongoing, and completed road construction projects
                    </p>
                </div>

                <div className="filters-bar animate-fade-in-up">
                    <div className="tabs-bar">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="state-filter">
                        <MapPin size={16} className="state-filter-icon" />
                        <select
                            className="form-select state-select"
                            value={selectedState}
                            onChange={e => setSelectedState(e.target.value)}
                        >
                            {availableStates.map(st => (
                                <option key={st} value={st}>{st}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="roads-grid">
                    {displayedRoads.map((road, i) => {
                        const config = statusConfig[road.status] || statusConfig.ongoing
                        const Icon = config.icon
                        return (
                            <div
                                key={road.id}
                                className="road-card glass-card animate-fade-in-up"
                                style={{ animationDelay: `${i * 0.08}s` }}
                            >
                                <div className="road-header">
                                    <div
                                        className="road-status-badge"
                                        style={{ color: config.color, borderColor: config.color }}
                                    >
                                        <Icon size={14} />
                                        {config.label}
                                    </div>
                                    <span className="road-id">{road.id}</span>
                                </div>

                                <h3 className="road-name">{road.name}</h3>

                                <div className="road-details">
                                    <div className="road-detail">
                                        <MapPin size={14} />
                                        <span>{road.location}</span>
                                    </div>
                                    <div className="road-detail">
                                        <Building2 size={14} />
                                        <span>{road.contractor}</span>
                                    </div>
                                    <div className="road-detail">
                                        <DollarSign size={14} />
                                        <span>{road.budget}</span>
                                    </div>
                                    <div className="road-detail">
                                        <Calendar size={14} />
                                        <span>{road.startDate} → {road.expectedEnd}</span>
                                    </div>
                                </div>

                                {road.status !== 'sanctioned' && (
                                    <div className="progress-wrapper">
                                        <div className="progress-header">
                                            <span>Progress</span>
                                            <span>{road.progress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width: `${road.progress}%`,
                                                    background:
                                                        road.progress === 100
                                                            ? 'var(--accent-success)'
                                                            : 'var(--gradient-accent)'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {displayedRoads.length === 0 && !loading && (
                    <div className="empty-state glass-card">
                        <HardHat size={40} />
                        <h3>No projects found</h3>
                        <p>No road projects match this filter.</p>
                    </div>
                )}
            </div>
        </div>
    )
}