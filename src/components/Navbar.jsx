import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Shield, MapPin, FileText, Users, Map, HardHat, LayoutDashboard, Languages, Wallet, ShieldCheck, Navigation } from 'lucide-react'
import { apiFetch } from './api'
import './Navbar.css'

const navLinks = [
    { path: '/', label: 'Home', icon: Shield },
    { path: '/report', label: 'Report', icon: FileText },
    { path: '/track', label: 'Track', icon: MapPin },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/roads', label: 'Roads', icon: HardHat },
    { path: '/trust', label: 'Trust Graph', icon: ShieldCheck },
    { path: '/route', label: 'Smart Route', icon: Navigation },
    { path: '/admin', label: 'Admin', icon: LayoutDashboard },
]

export default function Navbar() {
    const [open, setOpen] = useState(false)
    const [points, setPoints] = useState(0)
    const location = useLocation()


    // Generate or get userId from localStorage
    function getUserId() {
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
    }

    const fetchWallet = async () => {
        try {
            const userId = getUserId();
            const res = await apiFetch(`/api/user/wallet?userId=${userId}`)
            const data = await res.json()
            if (data.success) setPoints(data.wallet.points)
        } catch (err) {
            console.error("Wallet fetch error:", err)
        }
    }

    useEffect(() => {
        fetchWallet()
        window.addEventListener('walletUpdated', fetchWallet)
        return () => window.removeEventListener('walletUpdated', fetchWallet)
    }, [])

    const isHindi = document.cookie.includes('googtrans=/en/hi')

    const toggleLanguage = () => {
        if (isHindi) {
            document.cookie = 'googtrans=/en/en; path=/';
            document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
            window.location.reload();
        } else {
            document.cookie = 'googtrans=/en/hi; path=/';
            window.location.reload();
        }
    }

    return (
        <nav className="navbar glass">
            <div className="nav-container">
                <Link to="/" className="nav-logo" onClick={() => setOpen(false)}>
                    <div className="stacked-logo">
                        <span>Snap</span>
                        <span>Send</span>
                        <span>Solve</span>
                    </div>
                </Link>

                <div className={`nav-links ${open ? 'active' : ''}`}>
                    {navLinks.map(({ path, label, icon: Icon }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`nav-link ${location.pathname === path ? 'active' : ''}`}
                            onClick={() => setOpen(false)}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="nav-actions">
                    <div
                        className="wallet-badge"
                        title="Your Reward Points to spend on eCommerce"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(234, 179, 8, 0.15)',
                            padding: '6px 12px',
                            borderRadius: '100px',
                            fontWeight: 700,
                            color: '#ca8a04',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Wallet size={18} />
                        <span>{points} Pts</span>
                    </div>

                    <button
                        className="lang-toggle-btn"
                        onClick={toggleLanguage}
                        title={isHindi ? "Switch to English" : "Switch to Hindi"}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                        }}
                    >
                        <Languages size={20} style={{ color: 'var(--accent-primary)' }} />
                        <span className="lang-text">{isHindi ? 'English' : 'हिंदी'}</span>
                    </button>

                    <button className="nav-toggle" onClick={() => setOpen(!open)}>
                        {open ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>
        </nav>
    )
}