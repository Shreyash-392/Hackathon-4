import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import ReportIssue from './pages/ReportIssue'
import TrackComplaint from './pages/TrackComplaint'
import Community from './pages/Community'
import MapView from './pages/MapView'
import Roads from './pages/Roads'
import AdminDashboard from './pages/AdminDashboard'

function App() {
    return (
        <div className="app">
            <Navbar />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/report" element={<ReportIssue />} />
                <Route path="/track" element={<TrackComplaint />} />
                <Route path="/community" element={<Community />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/roads" element={<Roads />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </div>
    )
}

export default App
