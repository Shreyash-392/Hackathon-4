import { useState, useEffect } from 'react'
import { Search, MapPin, Clock, CheckCircle, AlertTriangle, RefreshCw, Copy, Shield, Loader2, RotateCcw, Wrench } from 'lucide-react'
import './TrackComplaint.css'
import { apiFetch } from '../components/api'

const STATUS_CONFIG = {
    pending: { color: 'var(--accent-warning)', label: 'Pending', icon: Clock },
    'in-progress': { color: 'var(--accent-primary)', label: 'In Progress', icon: RefreshCw },
    resolved: { color: 'var(--accent-success)', label: 'Resolved', icon: CheckCircle },
    reopened: { color: 'var(--accent-danger)', label: 'Reopened', icon: AlertTriangle },
}

export default function TrackComplaint() {
    const [trackingId, setTrackingId] = useState('')
    const [complaint, setComplaint] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [reopenReason, setReopenReason] = useState('')
    const [showReopen, setShowReopen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [contractorsMap, setContractorsMap] = useState({})

    useEffect(() => {
        apiFetch('/api/contractors')
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const cmap = {}
                    data.contractors.forEach(c => cmap[c.id] = c.name)
                    setContractorsMap(cmap)
                }
            })
            .catch(() => { })
    }, [])

    const handleTrack = async (e, showLoading = true) => {
        if (e) e.preventDefault()
        if (!trackingId.trim()) return
        if (showLoading) setLoading(true)
        if (showLoading) setError('')
        if (showLoading) setComplaint(null)
        try {
            const res = await apiFetch(`/api/complaints/track/${trackingId.trim()}`)
            const data = await res.json()
            if (data.success) setComplaint(data.complaint)
            else if (showLoading) setError('No complaint found with this tracking ID.')
        } catch {
            if (showLoading) setError('Failed to fetch. Please try again.')
        }
        if (showLoading) setLoading(false)
    }

    useEffect(() => {
        if (!complaint) return;
        const interval = setInterval(() => handleTrack(null, false), 15000);
        const handleFocus = () => handleTrack(null, false);
        window.addEventListener('focus', handleFocus);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [complaint?.trackingId, trackingId]);

    const handleReopen = async () => {
        if (!reopenReason.trim()) return
        try {
            const res = await apiFetch(`/api/complaints/${complaint.id}/reopen`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: reopenReason })
            })
            const data = await res.json()
            if (data.success) {
                setComplaint(data.complaint)
                setShowReopen(false)
                setReopenReason('')
            }
        } catch { }
    }

    const copyId = () => {
        navigator.clipboard.writeText(complaint.trackingId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="page track-page">
            <div className="container">
                <div className="page-header">
                    <h1 className="page-title">Track Your Complaint</h1>
                    <p className="page-subtitle">Enter your tracking ID to see the current status</p>
                </div>

                <form className="track-form glass-card animate-fade-in-up" onSubmit={handleTrack}>
                    <div className="track-input-group">
                        <Search size={20} className="track-icon" />
                        <input className="track-input" placeholder="Enter Tracking ID (e.g., CIV-XXXXX-XXXX)" value={trackingId}
                            onChange={e => setTrackingId(e.target.value.toUpperCase())} />
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={18} className="spinner" /> : 'Track'}
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="error-card glass-card animate-fade-in-up">
                        <AlertTriangle size={20} />
                        <p>{error}</p>
                    </div>
                )}

                {complaint && (
                    <div className="complaint-detail animate-fade-in-up">
                        {/* Header */}
                        <div className="detail-header glass-card">
                            <div className="detail-header-top">
                                <div>
                                    <h2>{complaint.title}</h2>
                                    <div className="detail-meta">
                                        <span className={`badge badge-${complaint.priority}`}>{complaint.priority} priority</span>
                                        <span className="badge badge-category">{complaint.category}</span>
                                        <span className={`badge badge-${complaint.status}`}>{STATUS_CONFIG[complaint.status]?.label || complaint.status}</span>
                                    </div>
                                </div>
                                <div className="detail-tracking">
                                    <span className="tracking-label">Tracking ID</span>
                                    <div className="tracking-id-inline">
                                        <span>{complaint.trackingId}</span>
                                        <button className="btn-icon btn-secondary" onClick={copyId}>
                                            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-grid">
                            {/* Description & Photo */}
                            <div className="detail-content glass-card">
                                <h3>Description</h3>
                                <p>{complaint.description}</p>
                                {complaint.photo && (
                                    <div className="detail-photo">
                                        <img src={complaint.photo} alt="Issue" />
                                    </div>
                                )}
                                <div className="detail-location">
                                    <MapPin size={16} />
                                    <span>{complaint.location?.address || `${complaint.location?.landmark || ''}, ${complaint.location?.city || ''}, ${complaint.location?.state || ''}`}</span>
                                </div>
                                {complaint.department && (
                                    <div className="detail-department">
                                        <span>Assigned to: <strong>{complaint.department}</strong></span>
                                    </div>
                                )}

                                {complaint.assignedContractorId && (
                                    <div className="allotment-info" style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                                        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Wrench size={16} color="var(--accent-success)" /> Repair Allotment Details</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <div><strong style={{ color: 'var(--text-primary)' }}>Evaluating Dept:</strong><br />{complaint.evaluatingDepartment || complaint.department || 'Not Specified'}</div>
                                            <div><strong style={{ color: 'var(--text-primary)' }}>Assigned Contractor:</strong><br />{contractorsMap[complaint.assignedContractorId] || complaint.assignedContractorId}</div>
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <strong style={{ color: 'var(--text-primary)' }}>Time since assignment:</strong><br />
                                                {(() => {
                                                    if (!complaint.assignedAt) return 'N/A';
                                                    if (complaint.status === 'resolved') {
                                                        // Calculate time taken to resolve. Get last evaluated/resolved timestamp.
                                                        const resolvedEntry = complaint.statusHistory.slice().reverse().find(e => e.status === 'resolved' || e.status === 'evaluated')
                                                        const endMs = resolvedEntry ? new Date(resolvedEntry.timestamp).getTime() : Date.now();
                                                        const diffMs = endMs - new Date(complaint.assignedAt).getTime();
                                                        const diffHrs = Math.floor(diffMs / 3600000);
                                                        const diffDays = Math.floor(diffHrs / 24);
                                                        return `Resolved in ${diffDays > 0 ? diffDays + ' days, ' + (diffHrs % 24) + ' hrs' : diffHrs + ' hrs'}`;
                                                    }
                                                    const diffMs = Date.now() - new Date(complaint.assignedAt).getTime();
                                                    const diffHrs = Math.floor(diffMs / 3600000);
                                                    const diffDays = Math.floor(diffHrs / 24);
                                                    if (diffDays > 0) return `${diffDays} days, ${diffHrs % 24} hours`;
                                                    if (diffHrs > 0) return `${diffHrs} hours`;
                                                    const diffMins = Math.floor(diffMs / 60000);
                                                    return `${diffMins} minutes`;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="anonymity-banner mt-2">
                                    <Shield size={14} />
                                    <span>Your identity remains anonymous</span>
                                </div>
                            </div>

                            {/* Status Timeline */}
                            <div className="timeline-card glass-card">
                                <h3>Status Timeline</h3>
                                <div className="timeline">
                                    {complaint.statusHistory?.map((entry, i) => {
                                        const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending
                                        const Icon = config.icon
                                        return (
                                            <div key={i} className="timeline-item">
                                                <div className="timeline-marker" style={{ borderColor: config.color }}>
                                                    <Icon size={14} style={{ color: config.color }} />
                                                </div>
                                                <div className="timeline-content">
                                                    <div className="timeline-status" style={{ color: config.color }}>{config.label}</div>
                                                    <p className="timeline-note">{entry.note}</p>
                                                    <span className="timeline-date">{new Date(entry.timestamp).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Repair Timeline */}
                        <div className="repair-timeline glass-card animate-fade-in-up">
                            <h3>🔧 Expected Repair Timeline</h3>
                            <p className="repair-subtitle">Estimated resolution steps based on {complaint.priority} priority</p>
                            <div className="repair-steps">
                                {(() => {
                                    const createdDate = new Date(complaint.createdAt)
                                    const isResolved = complaint.status === 'resolved'
                                    const dayOffsets = complaint.priority === 'high' ? [0, 1, 2, 3] : complaint.priority === 'medium' ? [0, 2, 5, 7] : [0, 3, 7, 14]
                                    const steps = [
                                        { label: 'Complaint Registered', desc: 'Issue received and logged', done: true },
                                        { label: 'Review & Assignment', desc: 'Routed to concerned department', done: complaint.status !== 'pending' },
                                        { label: 'Fieldwork & Repair', desc: 'On-ground team dispatched', done: complaint.status === 'resolved' || complaint.status === 'in-progress' },
                                        { label: 'Resolved & Verified', desc: 'Issue fixed and confirmed', done: isResolved },
                                    ]
                                    return steps.map((step, i) => {
                                        const stepDate = new Date(createdDate)
                                        stepDate.setDate(stepDate.getDate() + dayOffsets[i])
                                        return (
                                            <div key={i} className={`repair-step ${step.done ? 'done' : ''} ${i === steps.findIndex(s => !s.done) ? 'current' : ''}`}>
                                                <div className="repair-step-indicator">
                                                    <div className="repair-dot"></div>
                                                    {i < 3 && <div className="repair-line"></div>}
                                                </div>
                                                <div className="repair-step-content">
                                                    <div className="repair-step-header">
                                                        <span className="repair-step-label">{step.label}</span>
                                                        <span className="repair-step-date">
                                                            {step.done ? '✓ ' : 'Est. '}
                                                            {stepDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <p className="repair-step-desc">{step.desc}</p>
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>

                        {/* Reopen */}
                        {complaint.status === 'resolved' && (
                            <div className="reopen-section glass-card animate-fade-in-up">
                                {!showReopen ? (
                                    <button className="btn btn-danger" onClick={() => setShowReopen(true)}>
                                        <RotateCcw size={16} />
                                        Not Satisfied? Reopen Complaint
                                    </button>
                                ) : (
                                    <div className="reopen-form">
                                        <h4>Why are you reopening this complaint?</h4>
                                        <textarea className="form-textarea" value={reopenReason} onChange={e => setReopenReason(e.target.value)} placeholder="Explain why the issue is not resolved..." />
                                        <div className="reopen-actions">
                                            <button className="btn btn-danger" onClick={handleReopen}>Reopen</button>
                                            <button className="btn btn-secondary" onClick={() => setShowReopen(false)}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AI Analysis */}
                        {complaint.aiAnalysis && (
                            <div className="ai-summary glass-card animate-fade-in-up">
                                <h3>AI Analysis Summary</h3>
                                <div className="ai-summary-grid">
                                    <div><strong>Severity:</strong> {complaint.aiAnalysis.severity} ({complaint.aiAnalysis.severityScore}/10)</div>
                                    <div><strong>Department:</strong> {complaint.aiAnalysis.department}</div>
                                    <div><strong>Est. Resolution:</strong> {complaint.aiAnalysis.estimatedResolution}</div>
                                </div>
                                <p className="mt-2">{complaint.aiAnalysis.analysis}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
