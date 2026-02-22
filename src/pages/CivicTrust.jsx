import { useState, useEffect, useMemo, useRef } from 'react'
import { ShieldCheck, Zap, AlertCircle, Activity, ArrowRight } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'
import './CivicTrust.css'
import { apiFetch } from '../components/api'

export default function CivicTrust() {
    const [complaints, setComplaints] = useState([])
    const [loading, setLoading] = useState(true)
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 })
    const containerRef = useRef()

    useEffect(() => {
        apiFetch('/api/complaints')
            .then(r => r.json())
            .then(data => {
                if (data.success) setComplaints(data.complaints)
                setLoading(false)
            })
            .catch(() => setLoading(false))

        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                setDimensions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                })
            }
        })
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    const metrics = useMemo(() => {
        if (!complaints.length) return null

        const deptStats = {}
        complaints.forEach(c => {
            const dept = c.evaluatingDepartment || c.department
            if (!dept) return

            if (!deptStats[dept]) {
                deptStats[dept] = { total: 0, reopened: 0, resolutionTimes: [] }
            }
            deptStats[dept].total++
            if (c.status === 'reopened') deptStats[dept].reopened++

            if (c.status === 'resolved' && c.assignedAt) {
                const resolvedEntry = c.statusHistory.slice().reverse().find(e => e.status === 'resolved' || e.status === 'evaluated')
                if (resolvedEntry) {
                    const diffHrs = (new Date(resolvedEntry.timestamp).getTime() - new Date(c.assignedAt).getTime()) / 3600000
                    if (diffHrs > 0) deptStats[dept].resolutionTimes.push(diffHrs)
                }
            }
        })

        let mostComplaints = { name: 'N/A', count: 0 }
        let highestReopen = { name: 'N/A', rate: 0 }
        let fastestResolution = { name: 'N/A', avgHrs: Infinity }

        Object.entries(deptStats).forEach(([dept, stats]) => {
            if (stats.total > mostComplaints.count) {
                mostComplaints = { name: dept, count: stats.total }
            }

            const reopenRate = (stats.reopened / stats.total) * 100
            if (reopenRate > highestReopen.rate) {
                highestReopen = { name: dept, rate: reopenRate }
            }

            if (stats.resolutionTimes.length > 0) {
                const avg = stats.resolutionTimes.reduce((a, b) => a + b, 0) / stats.resolutionTimes.length
                if (avg < fastestResolution.avgHrs) {
                    fastestResolution = { name: dept, avgHrs: avg }
                }
            }
        })

        // Graph Data
        const nodes = [{ id: 'Citizens', name: 'Citizens', val: 20, group: 1 }]
        const links = []

        Object.entries(deptStats).forEach(([dept, stats]) => {
            nodes.push({ id: dept, name: dept, val: Math.min(2 + stats.total, 15), group: 2 })
            links.push({ source: 'Citizens', target: dept, value: stats.total })
        })

        const graphData = { nodes, links }

        return { mostComplaints, highestReopen, fastestResolution, graphData }
    }, [complaints])

    if (loading) return <div className="page loading"><div className="spinner"></div></div>

    return (
        <div className="page trust-page">
            <div className="container">
                <div className="page-header text-center animate-fade-in-up">
                    <h1 className="page-title"><Activity className="inline-icon" /> Civic Trust Graph</h1>
                    <p className="page-subtitle">Mapping the relationship and performance between Citizens and Civic Departments.</p>
                </div>

                {metrics ? (
                    <>
                        <div className="trust-metrics-grid animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <div className="trust-metric glass-card">
                                <div className="metric-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--accent-primary)' }}>
                                    <AlertCircle size={24} />
                                </div>
                                <div className="metric-info">
                                    <span className="metric-label">Most Complaints</span>
                                    <strong className="metric-value">{metrics.mostComplaints.name}</strong>
                                    <span className="metric-sub">{metrics.mostComplaints.count} Tickets</span>
                                </div>
                            </div>
                            <div className="trust-metric glass-card">
                                <div className="metric-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-success)' }}>
                                    <Zap size={24} />
                                </div>
                                <div className="metric-info">
                                    <span className="metric-label">Fastest Resolution Phase</span>
                                    <strong className="metric-value">{metrics.fastestResolution.name !== 'N/A' ? metrics.fastestResolution.name : 'Not enough data'}</strong>
                                    {metrics.fastestResolution.avgHrs !== Infinity && (
                                        <span className="metric-sub">Avg {Math.round(metrics.fastestResolution.avgHrs)} Hours</span>
                                    )}
                                </div>
                            </div>
                            <div className="trust-metric glass-card">
                                <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
                                    <Activity size={24} />
                                </div>
                                <div className="metric-info">
                                    <span className="metric-label">Highest Reopen Rate</span>
                                    <strong className="metric-value">{metrics.highestReopen.name !== 'N/A' ? metrics.highestReopen.name : 'None'}</strong>
                                    {metrics.highestReopen.rate > 0 && (
                                        <span className="metric-sub">{metrics.highestReopen.rate.toFixed(1)}% Reopened</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="trust-graph-container glass-card animate-fade-in-up" style={{ animationDelay: '0.2s', marginTop: '30px' }}>
                            <div className="graph-header">
                                <h3>Citizen ↔ Department Flow</h3>
                                <div className="graph-legend">
                                    <span><span className="legend-dot" style={{ background: '#F97316' }}></span> Citizens</span>
                                    <span><span className="legend-dot" style={{ background: '#0F766E' }}></span> Departments</span>
                                </div>
                            </div>
                            <div className="graph-wrapper" ref={containerRef} style={{ height: '500px', width: '100%', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                                {dimensions.width > 0 && (
                                    <ForceGraph2D
                                        width={dimensions.width}
                                        height={500}
                                        graphData={metrics.graphData}
                                        nodeLabel="name"
                                        nodeColor={node => node.group === 1 ? '#F97316' : '#0F766E'}
                                        linkColor={() => 'rgba(249, 115, 22, 0.2)'}
                                        linkWidth={link => Math.max(1, Math.min(link.value, 15))}
                                        nodeRelSize={6}
                                        linkDirectionalParticles={2}
                                        linkDirectionalParticleWidth={link => Math.max(2, Math.min(link.value / 2, 4))}
                                        d3VelocityDecay={0.1}
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="glass-card text-center" style={{ padding: '40px' }}>
                        <p>Not enough data to map relationships. Go report some issues!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
