import { useState, useEffect } from 'react'
import { HardHat, CheckCircle, Clock, Calendar, DollarSign, MapPin, Building2 } from 'lucide-react'
import './Roads.css'

export default function Roads() {
    const [roads, setRoads] = useState([])
    const [activeTab, setActiveTab] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const params = activeTab !== 'all' ? `?status=${activeTab}` : ''
        fetch(`/api/complaints/roads/list${params}`)
            .then(r => r.json())
            .then(data => { if (data.success) setRoads(data.roads) })
            .catch(() => { })
            .finally(() => setLoading(false))
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
                    <p className="page-subtitle">Track sanctioned, ongoing, and completed road construction projects</p>
                </div>

                {/* Tabs */}
                <div className="tabs-bar animate-fade-in-up">
                    {tabs.map(t => (
                        <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Road Cards */}
                <div className="roads-grid">
                    {roads.map((road, i) => {
                        const config = statusConfig[road.status] || statusConfig.ongoing
                        const Icon = config.icon
                        return (
                            <div key={road.id} className="road-card glass-card animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                                <div className="road-header">
                                    <div className="road-status-badge" style={{ color: config.color, borderColor: config.color }}>
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
                                {/* Progress Bar */}
                                {road.status !== 'sanctioned' && (
                                    <div className="progress-wrapper">
                                        <div className="progress-header">
                                            <span>Progress</span>
                                            <span>{road.progress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{
                                                width: `${road.progress}%`,
                                                background: road.progress === 100 ? 'var(--accent-success)' : 'var(--gradient-accent)'
                                            }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {roads.length === 0 && !loading && (
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
