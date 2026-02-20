import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Shield, MapPin, FileText, Users, Map, HardHat, LayoutDashboard } from 'lucide-react'
import './Navbar.css'

const navLinks = [
    { path: '/', label: 'Home', icon: Shield },
    { path: '/report', label: 'Report', icon: FileText },
    { path: '/track', label: 'Track', icon: MapPin },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/map', label: 'Map', icon: Map },
    { path: '/roads', label: 'Roads', icon: HardHat },
    { path: '/admin', label: 'Admin', icon: LayoutDashboard },
]

export default function Navbar() {
    const [open, setOpen] = useState(false)
    const location = useLocation()

    return (
        <nav className="navbar glass">
            <div className="nav-container">
                <Link to="/" className="nav-logo" onClick={() => setOpen(false)}>
                    <Shield size={28} />
                    <span>CivicResolve</span>
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
                <button className="nav-toggle" onClick={() => setOpen(!open)}>
                    {open ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </nav>
    )
}
