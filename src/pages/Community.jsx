import { useState, useEffect } from 'react'
import { ThumbsUp, MapPin, Filter, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import './Community.css'

export default function Community() {
    const [complaints, setComplaints] = useState([])
    const [filters, setFilters] = useState({ category: 'all', status: 'all', sort: 'recent' })
    const [loading, setLoading] = useState(true)

    const fetchComplaints = async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (filters.category !== 'all') params.append('category', filters.category)
        if (filters.status !== 'all') params.append('status', filters.status)
        if (filters.sort === 'votes') params.append('sort', 'votes')
        if (filters.sort === 'priority') params.append('sort', 'priority')

        try {
            const res = await fetch(`/api/complaints?${params}`)
            const data = await res.json()
            if (data.success) setComplaints(data.complaints)
        } catch { }
        setLoading(false)
    }

    useEffect(() => { fetchComplaints() }, [filters])

    const handleVote = async (id) => {
        try {
            const res = await fetch(`/api/complaints/${id}/vote`, { method: 'PUT' })
            const data = await res.json()
            if (data.success) {
                setComplaints(prev => prev.map(c => c.id === id ? { ...c, votes: data.votes } : c))
            }
        } catch { }
    }

    const statusIcon = (status) => {
        if (status === 'resolved') return <CheckCircle size={14} />
        if (status === 'in-progress') return <Clock size={14} />
        return <AlertTriangle size={14} />
    }

    const timeAgo = (date) => {
        const diff = Date.now() - new Date(date).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        return `${days}d ago`
    }

    return (
        <div className="page community-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Community Feed</h1>
                    <p className="page-subtitle">Browse reported issues and vote on what matters most to your community</p>
                </div>

                {/* Filters */}
                <div className="filters-bar glass-card animate-fade-in-up">
                    <div className="filter-group">
                        <Filter size={16} />
                        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                            <option value="all">All Categories</option>
                            {['Roads', 'Water', 'Electricity', 'Sanitation', 'Safety', 'Drainage', 'Streetlights', 'Parks', 'Other'].map(c =>
                                <option key={c} value={c}>{c}</option>
                            )}
                        </select>
                    </div>
                    <div className="filter-group">
                        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <select className="filter-select" value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                            <option value="recent">Most Recent</option>
                            <option value="votes">Most Votes</option>
                            <option value="priority">Highest Priority</option>
                        </select>
                    </div>
                </div>

                {/* Complaint Cards */}
                {loading ? (
                    <div className="loading-state">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="skeleton-card glass-card"></div>
                        ))}
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="empty-state glass-card animate-fade-in-up">
                        <AlertTriangle size={40} />
                        <h3>No complaints found</h3>
                        <p>Be the first to report an issue in your community!</p>
                    </div>
                ) : (
                    <div className="community-grid">
                        {complaints.map((c, i) => (
                            <div key={c.id} className="community-card glass-card animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                                {c.photo && (
                                    <div className="card-photo">
                                        <img src={c.photo} alt={c.title} loading="lazy" />
                                    </div>
                                )}
                                <div className="card-body">
                                    <div className="card-badges">
                                        <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                                        <span className="badge badge-category">{c.category}</span>
                                        <span className={`badge badge-${c.status}`}>
                                            {statusIcon(c.status)}
                                            {c.status}
                                        </span>
                                    </div>
                                    <h3 className="card-title">{c.title}</h3>
                                    <p className="card-desc">{c.description?.substring(0, 120)}{c.description?.length > 120 ? '...' : ''}</p>
                                    <div className="card-location">
                                        <MapPin size={14} />
                                        <span>{c.location?.address || c.location?.city || c.location?.landmark || 'Location tagged'}</span>
                                    </div>
                                    <div className="card-footer">
                                        <span className="card-time">{timeAgo(c.createdAt)}</span>
                                        <button className="vote-btn" onClick={() => handleVote(c.id)}>
                                            <ThumbsUp size={16} />
                                            <span>{c.votes}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
