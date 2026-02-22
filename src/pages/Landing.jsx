import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Search, Users, MapPin, Shield, ArrowRight, TrendingUp, CheckCircle, Clock, AlertTriangle, Camera, Send, Wrench, ChevronDown, Star, Zap, Eye, Award } from 'lucide-react'
import './Landing.css'
import { apiFetch } from '../components/api'

const base = import.meta.env.BASE_URL

const FAQS = [
    { q: "Is my identity really anonymous?", a: "Yes, 100%. We do not collect your name, email, phone number, or any personal data. Your complaint is submitted without any identifying information." },
    { q: "How do I track my complaint after submitting?", a: "When you submit a complaint, you'll receive a unique tracking ID. Use this ID on the 'Track' page to see real-time status updates and the resolution timeline." },
    { q: "What kind of issues can I report?", a: "You can report any civic issue — potholes, broken streetlights, water supply problems, sanitation issues, safety concerns, drainage blockages, and more." },
    { q: "How is my complaint routed to the right department?", a: "Our AI analysis engine automatically categorizes your complaint and routes it to the concerned government department (PWD, Municipal Corporation, Electricity Board, etc.)." },
    { q: "Can I reopen a complaint if it's not resolved?", a: "Yes! If your complaint is marked as resolved but the issue persists, you can reopen it from the tracking page with an explanation." },
    { q: "How does the voting system work?", a: "You can upvote complaints in your area from the Community Feed. Complaints with more votes get higher priority, which helps authorities focus on the most pressing issues." },
]

const TESTIMONIALS = [
    { text: "Reported a pothole near my house. It was fixed within 5 days! The tracking feature kept me informed every step.", stars: 5, area: "Andheri, Mumbai" },
    { text: "The streetlight on our road was broken for weeks. One report on Snap Send Solve and the electricity board responded in 48 hours.", stars: 5, area: "Koramangala, Bangalore" },
    { text: "Love the anonymity feature. I can report issues without any fear. The AI analysis is remarkably accurate.", stars: 4, area: "Sector 62, Noida" },
]

// Animated counter hook
function useCountUp(end, duration = 1500, start = 0) {
    const [count, setCount] = useState(start)
    const [triggered, setTriggered] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && !triggered) setTriggered(true) },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [triggered])

    useEffect(() => {
        if (!triggered || end === 0) return
        let startTime = null
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)
            setCount(Math.floor(progress * (end - start) + start))
            if (progress < 1) requestAnimationFrame(animate)
        }
        requestAnimationFrame(animate)
    }, [triggered, end, duration, start])

    return { count, ref }
}

export default function Landing() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, inProgress: 0 })
    const [openFaq, setOpenFaq] = useState(-1)
    const [visible, setVisible] = useState(false)
    const [stepsVisible, setStepsVisible] = useState(false)
    const [testimonialIdx, setTestimonialIdx] = useState(0)
    const [topContractors, setTopContractors] = useState([])
    const stepsRef = useRef(null)

    const totalCounter = useCountUp(stats.total)
    const resolvedCounter = useCountUp(stats.resolved)
    const pendingCounter = useCountUp(stats.pending)
    const progressCounter = useCountUp(stats.inProgress)

    useEffect(() => {
        setVisible(true)
        apiFetch('/api/complaints/analytics/stats')
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const s = data.stats
                    setStats({
                        total: s.total,
                        resolved: s.byStatus.resolved || 0,
                        pending: s.byStatus.pending || 0,
                        inProgress: s.byStatus['in-progress'] || 0,
                    })
                }
            })
            .catch(() => { })

        apiFetch('/api/contractors')
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            setTopContractors(data.contractors.slice(0, 3));
        }
    })
    .catch(() => { })

        // Intersection observer for steps animation
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setStepsVisible(true) },
            { threshold: 0.2 }
        )
        if (stepsRef.current) observer.observe(stepsRef.current)

        // Testimonial rotation
        const tInterval = setInterval(() => {
            setTestimonialIdx(prev => (prev + 1) % TESTIMONIALS.length)
        }, 5000)

        return () => { observer.disconnect(); clearInterval(tInterval) }
    }, [])

    return (
        <div className="landing-page">
            {/* Soft background shapes */}
            <div className="hero-bg">
                <div className="soft-blob blob-1"></div>
                <div className="soft-blob blob-2"></div>
                <div className="soft-blob blob-3"></div>
            </div>

            {/* Hero */}
            <section className={`hero ${visible ? 'visible' : ''}`}>
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge animate-fade-in-up">
                            <Shield size={16} />
                            100% Anonymous & Secure
                        </div>
                        <h1 className="hero-title animate-fade-in-up stagger-1">
                            Something need fixing?<br />
                            <span className="text-gradient">Report it instantly.</span>
                        </h1>
                        <p className="hero-subtitle animate-fade-in-up stagger-2">
                            From getting potholes filled to encouraging better parking, report issues affecting your part of the world to local councils, utilities and more.
                        </p>
                        <div className="hero-actions animate-fade-in-up stagger-3">
                            <Link to="/report" className="btn btn-primary btn-lg pulse-btn">
                                <FileText size={20} />
                                Start Snapping
                                <ArrowRight size={18} />
                            </Link>
                            <Link to="/track" className="btn btn-secondary btn-lg">
                                <Search size={20} />
                                Track Request
                            </Link>
                        </div>
                        <div className="anonymity-banner animate-fade-in-up stagger-4">
                            <Shield size={18} />
                            <span>Your identity is completely anonymous.</span>
                        </div>
                    </div>
                    <div className="hero-image-wrapper animate-fade-in-up stagger-3">
                        <img src={`${base}images/hero_cover.png`} alt="Snap Send Solve Mascot" className="hero-cover-img" />
                    </div>
                </div>
            </section>

            {/* Stats — Clickable */}
            <section className="stats-section">
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-card glass-card animate-fade-in-up stagger-1 clickable" ref={totalCounter.ref} onClick={() => navigate('/community')}>
                            <div className="stat-icon" style={{ color: 'var(--accent-primary)' }}>
                                <TrendingUp size={28} />
                            </div>
                            <div className="stat-value">{totalCounter.count}</div>
                            <div className="stat-label">Total Reports</div>
                            <div className="stat-click-hint"><Eye size={12} /> View All</div>
                        </div>
                        <div className="stat-card glass-card animate-fade-in-up stagger-2 clickable stat-success" ref={resolvedCounter.ref} onClick={() => navigate('/admin')}>
                            <div className="stat-icon" style={{ color: 'var(--accent-success)' }}>
                                <CheckCircle size={28} />
                            </div>
                            <div className="stat-value">{resolvedCounter.count}</div>
                            <div className="stat-label">Resolved</div>
                            <div className="stat-click-hint"><Eye size={12} /> View Details</div>
                        </div>
                        <div className="stat-card glass-card animate-fade-in-up stagger-3 clickable stat-warning" ref={pendingCounter.ref} onClick={() => navigate('/admin')}>
                            <div className="stat-icon" style={{ color: 'var(--accent-warning)' }}>
                                <Clock size={28} />
                            </div>
                            <div className="stat-value">{pendingCounter.count}</div>
                            <div className="stat-label">Pending</div>
                            <div className="stat-click-hint"><Eye size={12} /> View Details</div>
                        </div>
                        <div className="stat-card glass-card animate-fade-in-up stagger-4 clickable stat-info" ref={progressCounter.ref} onClick={() => navigate('/admin')}>
                            <div className="stat-icon" style={{ color: 'var(--accent-secondary)' }}>
                                <AlertTriangle size={28} />
                            </div>
                            <div className="stat-value">{progressCounter.count}</div>
                            <div className="stat-label">In Progress</div>
                            <div className="stat-click-hint"><Eye size={12} /> View Details</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Top Contractors */}
            <section className="contractors-section">
                <div className="container">
                    <div className="section-header text-center">
                        <h2 className="section-title"><Award className="inline-icon" /> Top Ranked Contractors</h2>
                        <p className="section-subtitle">Recognizing the teams delivering the fastest and highest quality civic repairs.</p>
                    </div>
                    <div className="contractors-grid">
                        {topContractors.map((c, i) => (
                            <div key={c.id} className="contractor-card glass-card animate-fade-in-up" style={{ animationDelay: `${i * 0.15}s` }}>
                                <div className="contractor-rank">#{i + 1}</div>
                                <h3 className="contractor-name">{c.name}</h3>
                                <div className="contractor-stats">
                                    <div className="c-stat"><Star size={16} fill="var(--accent-warning)" color="var(--accent-warning)" /> {c.qualityRating}/5 Rating</div>
                                    <div className="c-stat"><CheckCircle size={16} color="var(--accent-success)" /> {c.totalWorks} Works Completed</div>
                                    <div className="c-stat points-badge"><Zap size={16} /> {c.points} Pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Flashcards — Civic Issues */}
            <section className="flashcards-section">
                <div className="container">
                    <h2 className="section-title">Common Civic Issues</h2>
                    <p className="section-subtitle">These are the problems your community faces every day — and you can help fix them</p>

                    <div className="flashcards-grid">
                        <div className="flashcard">
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <img src={`${base}images/pothole.png`} alt="Pothole on road" />
                                    <div className="flashcard-overlay">
                                        <span className="flashcard-category">Roads</span>
                                        <h4>Potholes & Road Damage</h4>
                                    </div>
                                </div>
                                <div className="flashcard-back">
                                    <h4>🛣️ Potholes & Road Damage</h4>
                                    <p>India has over 33 lakh km of roads, and potholes cause thousands of accidents annually. Report them to get them fixed faster.</p>
                                    <Link to="/report" className="btn btn-primary btn-sm">Report Now</Link>
                                </div>
                            </div>
                        </div>

                        <div className="flashcard">
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <img src={`${base}images/water_pipe.png`} alt="Broken water pipe" />
                                    <div className="flashcard-overlay">
                                        <span className="flashcard-category">Water</span>
                                        <h4>Broken Water Pipes</h4>
                                    </div>
                                </div>
                                <div className="flashcard-back">
                                    <h4>💧 Water Supply Issues</h4>
                                    <p>Broken pipes waste millions of litres daily. Reporting leaks helps ensure clean water reaches every household.</p>
                                    <Link to="/report" className="btn btn-primary btn-sm">Report Now</Link>
                                </div>
                            </div>
                        </div>

                        <div className="flashcard">
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <img src={`${base}images/garbage.png`} alt="Garbage dump" />
                                    <div className="flashcard-overlay">
                                        <span className="flashcard-category">Sanitation</span>
                                        <h4>Overflowing Garbage</h4>
                                    </div>
                                </div>
                                <div className="flashcard-back">
                                    <h4>🗑️ Sanitation & Waste</h4>
                                    <p>Improper waste disposal leads to health hazards and pollution. Your reports help civic authorities take action quickly.</p>
                                    <Link to="/report" className="btn btn-primary btn-sm">Report Now</Link>
                                </div>
                            </div>
                        </div>

                        <div className="flashcard">
                            <div className="flashcard-inner">
                                <div className="flashcard-front">
                                    <img src={`${base}images/streetlight.png`} alt="Broken streetlight" />
                                    <div className="flashcard-overlay">
                                        <span className="flashcard-category">Streetlights</span>
                                        <h4>Dark & Unsafe Streets</h4>
                                    </div>
                                </div>
                                <div className="flashcard-back">
                                    <h4>💡 Streetlight Failures</h4>
                                    <p>Dark streets pose safety risks, especially for women and children. Report broken lights to make your area safer.</p>
                                    <Link to="/report" className="btn btn-primary btn-sm">Report Now</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works — Big Flashcards */}
            <section className="how-it-works" ref={stepsRef}>
                <div className="container">
                    <h2 className="section-title">How It Works</h2>
                    <p className="section-subtitle">Three simple steps to fix your community</p>

                    <div className={`hiw-cards ${stepsVisible ? 'visible' : ''}`}>
                        <div className="hiw-card hiw-1">
                            <div className="hiw-card-image">
                                <img src={`${base}images/snap_it.png`} alt="Snap a photo" />
                            </div>
                            <div className="hiw-card-content">
                                <div className="hiw-step-number">01</div>
                                <h3>Snap It</h3>
                                <p>Take a photo of the civic issue — a pothole, broken pipe, overflowing garbage, or any problem you see in your neighbourhood.</p>
                                <div className="hiw-features">
                                    <span><Camera size={14} /> Photo Evidence</span>
                                    <span><Shield size={14} /> Anonymous</span>
                                </div>
                            </div>
                        </div>

                        <div className="hiw-card hiw-2">
                            <div className="hiw-card-image">
                                <img src={`${base}images/send_it.png`} alt="Pin and send" />
                            </div>
                            <div className="hiw-card-content">
                                <div className="hiw-step-number">02</div>
                                <h3>Send It</h3>
                                <p>Pin the exact location on the map, add a short description, and submit your report. No login or personal details required.</p>
                                <div className="hiw-features">
                                    <span><MapPin size={14} /> GPS Location</span>
                                    <span><Zap size={14} /> Instant Submit</span>
                                </div>
                            </div>
                        </div>

                        <div className="hiw-card hiw-3">
                            <div className="hiw-card-image">
                                <img src={`${base}images/solve_it.png`} alt="Track resolution" />
                            </div>
                            <div className="hiw-card-content">
                                <div className="hiw-step-number">03</div>
                                <h3>Solve It</h3>
                                <p>Your complaint is routed to the right department via AI. Track progress in real-time and see the issue resolved.</p>
                                <div className="hiw-features">
                                    <span><Zap size={14} /> AI Powered</span>
                                    <span><Eye size={14} /> Real-time Tracking</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials-section">
                <div className="container">
                    <h2 className="section-title">What Citizens Say</h2>
                    <p className="section-subtitle">Real impact from real reports</p>

                    <div className="testimonial-carousel">
                        {TESTIMONIALS.map((t, i) => (
                            <div key={i} className={`testimonial-card glass-card ${i === testimonialIdx ? 'active' : ''}`}>
                                <div className="testimonial-stars">
                                    {[...Array(t.stars)].map((_, j) => (
                                        <Star key={j} size={16} fill="currentColor" />
                                    ))}
                                </div>
                                <p className="testimonial-text">"{t.text}"</p>
                                <div className="testimonial-author">
                                    <Shield size={14} />
                                    <span>Anonymous Citizen — {t.area}</span>
                                </div>
                            </div>
                        ))}
                        <div className="testimonial-dots">
                            {TESTIMONIALS.map((_, i) => (
                                <button key={i} className={`dot ${i === testimonialIdx ? 'active' : ''}`} onClick={() => setTestimonialIdx(i)} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="actions-section">
                <div className="container">
                    <div className="actions-grid">
                        <Link to="/community" className="action-card glass-card">
                            <Users size={32} />
                            <h3>Community Feed</h3>
                            <p>Browse issues and vote on what matters most</p>
                            <ArrowRight size={18} className="action-arrow" />
                        </Link>
                        <Link to="/map" className="action-card glass-card">
                            <MapPin size={32} />
                            <h3>Issue Map</h3>
                            <p>See all reported issues on an interactive map</p>
                            <ArrowRight size={18} className="action-arrow" />
                        </Link>
                        <Link to="/roads" className="action-card glass-card">
                            <TrendingUp size={32} />
                            <h3>Road Projects</h3>
                            <p>Track sanctioned, ongoing and completed roads</p>
                            <ArrowRight size={18} className="action-arrow" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* FAQs */}
            <section className="faq-section">
                <div className="container">
                    <h2 className="section-title">Frequently Asked Questions</h2>
                    <p className="section-subtitle">Everything you need to know about Snap Send Solve</p>

                    <div className="faq-list">
                        {FAQS.map((faq, i) => (
                            <div key={i} className={`faq-item glass-card ${openFaq === i ? 'open' : ''}`}
                                onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                                <div className="faq-question">
                                    <h4>{faq.q}</h4>
                                    <ChevronDown size={20} className="faq-chevron" />
                                </div>
                                <div className="faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <div className="stacked-logo">
                                <span>Snap</span>
                                <span>Send</span>
                                <span>Solve</span>
                            </div>
                        </div>
                        <p>Making communities better, one report at a time.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
