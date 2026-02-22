import { useState, useEffect } from 'react'
import { BarChart3, AlertTriangle, CheckCircle, Clock, TrendingUp, Search, RefreshCw, MapPin, Eye, X } from 'lucide-react'
import './AdminDashboard.css'
import { apiFetch } from '../components/api'

const DEPARTMENTS = [
    'Public Works Department (PWD)',
    'Water Supply & Sewerage Board',
    'Electricity Distribution Company',
    'Municipal Sanitation Department',
    'Public Safety & Police Department',
    'Drainage & Storm Water Department',
    'Electrical Maintenance Division',
    'Horticulture & Parks Department',
    'Municipal Corporation - General',
]

export default function AdminDashboard() {
    const [stats, setStats] = useState(null)
    const [complaints, setComplaints] = useState([])
    const [filters, setFilters] = useState({ category: 'all', status: 'all', priority: 'all', search: '' })
    const [selectedComplaint, setSelectedComplaint] = useState(null)
    const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '', department: '', contractorId: '', evaluatingDepartment: '' })
    const [contractors, setContractors] = useState([])
    const [evaluatePoints, setEvaluatePoints] = useState(50)
    const [evaluateFeedback, setEvaluateFeedback] = useState('')
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true);
        try {
            const statsRes = await apiFetch('/api/complaints/analytics/stats').then(r => r.json()).catch(() => ({ success: false, stats: null }));
            const complaintsRes = await apiFetch('/api/complaints').then(r => r.json()).catch(() => ({ success: false, complaints: [] }));
            const contractorsRes = await apiFetch('/api/contractors').then(r => r.json()).catch(() => ({ success: false, contractors: [] }));

            if (statsRes && statsRes.success) setStats(statsRes.stats);
            if (complaintsRes && complaintsRes.success) setComplaints(complaintsRes.complaints || []);
            if (contractorsRes && contractorsRes.success) setContractors(contractorsRes.contractors || []);
        } catch (e) { console.error("Admin fetch error", e) }
        setLoading(false)
    }
    useEffect(() => { fetchData() }, [])

    const filteredComplaints = complaints.filter(c => {
        if (filters.category !== 'all' && c.category !== filters.category) return false
        if (filters.status !== 'all' && c.status !== filters.status) return false
        if (filters.priority !== 'all' && c.priority !== filters.priority) return false
        if (filters.search) {
            const s = filters.search.toLowerCase()
            return c.title.toLowerCase().includes(s) || c.trackingId.toLowerCase().includes(s) || c.description.toLowerCase().includes(s)
        }
        return true
    })

    const handleStatusUpdate = async () => {
        if (!statusUpdate.status) return
        try {
            const res = await apiFetch(`/api/complaints/${selectedComplaint.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(statusUpdate)
            })
            const data = await res.json()
            if (data.success) {
                setSelectedComplaint(data.complaint)
                fetchData()
                setStatusUpdate({ status: '', note: '', department: '', contractorId: '', evaluatingDepartment: '' })
            }
        } catch { }
    }

    const handleEvaluate = async () => {
        if (!selectedComplaint || !selectedComplaint.assignedContractorId) return
        try {
            const res = await apiFetch(`/api/complaints/${selectedComplaint.id}/evaluate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: Number(evaluatePoints), feedback: evaluateFeedback })
            })
            const data = await res.json()
            if (data.success) {
                fetchData()
                setSelectedComplaint(data.complaint)
                setEvaluatePoints(50)
                setEvaluateFeedback('')
            }
        } catch { }
    }

    const topCategories = stats ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]) : []
    const maxCategoryCount = topCategories.length > 0 ? topCategories[0][1] : 1

    return (
        <div className="page admin-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Admin Dashboard</h1>
                    <p className="page-subtitle">Manage, prioritize, and resolve civic complaints</p>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="admin-stats-grid animate-fade-in-up">
                        <div className="admin-stat glass-card">
                            <TrendingUp size={24} style={{ color: 'var(--accent-primary)' }} />
                            <div className="admin-stat-value">{stats.total}</div>
                            <div className="admin-stat-label">Total Complaints</div>
                        </div>
                        <div className="admin-stat glass-card">
                            <Clock size={24} style={{ color: 'var(--accent-warning)' }} />
                            <div className="admin-stat-value">{stats.byStatus.pending || 0}</div>
                            <div className="admin-stat-label">Pending</div>
                        </div>
                        <div className="admin-stat glass-card">
                            <RefreshCw size={24} style={{ color: 'var(--accent-secondary)' }} />
                            <div className="admin-stat-value">{stats.byStatus['in-progress'] || 0}</div>
                            <div className="admin-stat-label">In Progress</div>
                        </div>
                        <div className="admin-stat glass-card">
                            <CheckCircle size={24} style={{ color: 'var(--accent-success)' }} />
                            <div className="admin-stat-value">{stats.byStatus.resolved || 0}</div>
                            <div className="admin-stat-label">Resolved</div>
                        </div>
                        <div className="admin-stat glass-card">
                            <AlertTriangle size={24} style={{ color: 'var(--accent-danger)' }} />
                            <div className="admin-stat-value">{stats.byPriority.high || 0}</div>
                            <div className="admin-stat-label">High Priority</div>
                        </div>
                    </div>
                )}

                {/* Analytics */}
                {stats && topCategories.length > 0 && (
                    <div className="analytics-section glass-card animate-fade-in-up">
                        <h3><BarChart3 size={18} /> Complaints by Category</h3>
                        <div className="bar-chart">
                            {topCategories.map(([cat, count]) => (
                                <div key={cat} className="bar-row">
                                    <span className="bar-label">{cat}</span>
                                    <div className="bar-track">
                                        <div className="bar-fill" style={{ width: `${(count / maxCategoryCount) * 100}%` }}></div>
                                    </div>
                                    <span className="bar-count">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters & Table */}
                <div className="table-section animate-fade-in-up">
                    <div className="table-filters glass-card">
                        <div className="search-box">
                            <Search size={16} />
                            <input placeholder="Search complaints..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                        </div>
                        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                            <option value="all">All Categories</option>
                            {['Roads', 'Water', 'Electricity', 'Sanitation', 'Safety', 'Drainage', 'Streetlights', 'Parks', 'Other'].map(c =>
                                <option key={c} value={c}>{c}</option>
                            )}
                        </select>
                        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="reopened">Reopened</option>
                        </select>
                        <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
                            <option value="all">All Priority</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    <div className="complaints-table glass-card" style={{ gridTemplateColumns: '80px 1.5fr 1fr 1fr 1fr 100px 60px 100px 80px' }}>
                        <div className="table-header">
                            <span>ID</span>
                            <span>Title</span>
                            <span>Category</span>
                            <span>Contractor</span>
                            <span>Priority</span>
                            <span>Status</span>
                            <span>Votes</span>
                            <span>Date</span>
                            <span>Action</span>
                        </div>
                        {filteredComplaints.length === 0 ? (
                            <div className="table-empty">No complaints found.</div>
                        ) : (
                            filteredComplaints.map(c => (
                                <div key={c.id} className="table-row">
                                    <span className="table-id">{c.trackingId}</span>
                                    <span className="table-title">{c.title}</span>
                                    <span><span className="badge badge-category">{c.category}</span></span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {c.assignedContractorId ? (contractors.find(ctr => ctr.id === c.assignedContractorId)?.name || c.assignedContractorId) : 'Unassigned'}
                                    </span>
                                    <span><span className={`badge badge-${c.priority}`}>{c.priority}</span></span>
                                    <span><span className={`badge badge-${c.status}`}>{c.status}</span></span>
                                    <span className="table-votes">{c.votes}</span>
                                    <span className="table-date">{new Date(c.createdAt).toLocaleDateString()}</span>
                                    <span>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedComplaint(c); setStatusUpdate({ status: c.status, note: '', department: c.department || '', contractorId: '', evaluatingDepartment: '' }) }}>
                                            <Eye size={14} /> View
                                        </button>
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Modal */}
                {selectedComplaint && (
                    <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
                        <div className="modal-content glass-card animate-fade-in-up" onClick={e => e.stopPropagation()}>
                            <button className="modal-close" onClick={() => setSelectedComplaint(null)}><X size={20} /></button>
                            <h2>{selectedComplaint.title}</h2>
                            <div className="modal-meta">
                                <span className={`badge badge-${selectedComplaint.priority}`}>{selectedComplaint.priority}</span>
                                <span className="badge badge-category">{selectedComplaint.category}</span>
                                <span className={`badge badge-${selectedComplaint.status}`}>{selectedComplaint.status}</span>
                                <span className="modal-tracking">{selectedComplaint.trackingId}</span>
                            </div>
                            <p className="modal-desc">{selectedComplaint.description}</p>
                            {selectedComplaint.photo && <img src={selectedComplaint.photo} alt="" className="modal-photo" />}
                            <div className="modal-location">
                                <MapPin size={14} />
                                <span>{selectedComplaint.location?.address || `${selectedComplaint.location?.landmark || ''}, ${selectedComplaint.location?.city || ''}`}</span>
                            </div>
                            <div className="modal-coords">
                                Lat: {selectedComplaint.location?.lat?.toFixed(4)}, Lng: {selectedComplaint.location?.lng?.toFixed(4)}
                            </div>

                            {/* Status Update */}
                            <div className="status-update-section">
                                <h3>Update Status</h3>
                                <div className="status-update-form">
                                    <select className="form-select" value={statusUpdate.status} onChange={e => setStatusUpdate(s => ({ ...s, status: e.target.value }))}>
                                        <option value={selectedComplaint.status} disabled>Current: {selectedComplaint.status}</option>
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                    <select className="form-select" value={statusUpdate.department} onChange={e => setStatusUpdate(s => ({ ...s, department: e.target.value }))}>
                                        <option value="">Assign / Route Dept</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>

                                    {statusUpdate.status === 'in-progress' && (
                                        <div className="allotment-fields" style={{ display: 'grid', gap: '10px', background: 'var(--bg-glass)', padding: '12px', borderRadius: '8px', gridColumn: '1 / -1', border: '1px solid var(--border-glass)' }}>
                                            <h4 style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Contractor Assignment</h4>
                                            <select className="form-select" value={statusUpdate.evaluatingDepartment} onChange={e => setStatusUpdate(s => ({ ...s, evaluatingDepartment: e.target.value }))}>
                                                <option value="">Evaluating Department</option>
                                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <select className="form-select" value={statusUpdate.contractorId} onChange={e => setStatusUpdate(s => ({ ...s, contractorId: e.target.value }))}>
                                                <option value="">Assign Contractor</option>
                                                {contractors.map(c => <option key={c.id} value={c.id}>{c.name} (Pts: {c.points})</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <input className="form-input" style={{ gridColumn: '1 / -1' }} placeholder="Add a note..." value={statusUpdate.note} onChange={e => setStatusUpdate(s => ({ ...s, note: e.target.value }))} />
                                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }} onClick={handleStatusUpdate}>Update Status & Allotment</button>
                                </div>
                            </div>

                            {/* Evaluate Contractor */}
                            {selectedComplaint.status === 'resolved' && selectedComplaint.assignedContractorId && (
                                <div className="evaluate-section" style={{ marginTop: '20px', background: 'rgba(234, 179, 8, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                                    <h3 style={{ color: '#ca8a04', marginBottom: '12px' }}>Evaluate Contractor: {contractors.find(c => c.id === selectedComplaint.assignedContractorId)?.name}</h3>
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <label style={{ fontWeight: 600 }}>Reward Points:</label>
                                            <input type="number" className="form-input" style={{ width: '100px' }} value={evaluatePoints} onChange={e => setEvaluatePoints(e.target.value)} />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>(Negative for penalties)</span>
                                        </div>
                                        <input className="form-input" placeholder="Feedback / Quality Remarks..." value={evaluateFeedback} onChange={e => setEvaluateFeedback(e.target.value)} />
                                        <button className="btn btn-secondary" style={{ background: '#EAB308', color: 'white', border: 'none' }} onClick={handleEvaluate}>Submit Evaluation</button>
                                    </div>
                                </div>
                            )}

                            {/* AI Summary */}
                            {selectedComplaint.aiAnalysis && (
                                <div className="modal-ai">
                                    <h3>AI Analysis</h3>
                                    <p><strong>Severity:</strong> {selectedComplaint.aiAnalysis.severity} ({selectedComplaint.aiAnalysis.severityScore}/10)</p>
                                    <p><strong>Recommended Dept:</strong> {selectedComplaint.aiAnalysis.department}</p>
                                    <p><strong>Est. Resolution:</strong> {selectedComplaint.aiAnalysis.estimatedResolution}</p>
                                    <p>{selectedComplaint.aiAnalysis.analysis}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
