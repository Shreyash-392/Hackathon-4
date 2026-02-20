import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import complaintsRouter from './routes/complaints.js';
import aiRouter from './routes/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Data directory
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Initialize data files
const complaintsFile = join(dataDir, 'complaints.json');
const roadsFile = join(dataDir, 'roads.json');

if (!fs.existsSync(complaintsFile)) {
    fs.writeFileSync(complaintsFile, JSON.stringify([], null, 2));
}

if (!fs.existsSync(roadsFile)) {
    fs.writeFileSync(roadsFile, JSON.stringify([
        { id: "R001", name: "NH-48 Highway Expansion", location: "Mumbai - Pune Corridor", status: "ongoing", progress: 65, startDate: "2025-03-01", expectedEnd: "2026-06-30", contractor: "L&T Infrastructure", budget: "₹450 Cr" },
        { id: "R002", name: "Ring Road Phase 2", location: "Bangalore Outer Ring", status: "sanctioned", progress: 0, startDate: "2026-04-01", expectedEnd: "2028-12-31", contractor: "TBD", budget: "₹800 Cr" },
        { id: "R003", name: "Smart City Road Network", location: "Pune - Hinjewadi", status: "completed", progress: 100, startDate: "2024-01-15", expectedEnd: "2025-12-01", contractor: "Shapoorji Pallonji", budget: "₹200 Cr" },
        { id: "R004", name: "Flyover Bridge Construction", location: "Delhi - Dwarka Sector 21", status: "ongoing", progress: 42, startDate: "2025-06-01", expectedEnd: "2027-03-30", contractor: "Gammon India", budget: "₹320 Cr" },
        { id: "R005", name: "Village Connectivity Road", location: "Rajasthan - Jodhpur District", status: "sanctioned", progress: 0, startDate: "2026-07-01", expectedEnd: "2027-12-31", contractor: "TBD", budget: "₹55 Cr" },
        { id: "R006", name: "Coastal Road Project", location: "Mumbai - Marine Drive to Kandivali", status: "ongoing", progress: 78, startDate: "2024-06-01", expectedEnd: "2026-05-31", contractor: "HCC Ltd", budget: "₹1200 Cr" },
        { id: "R007", name: "IT Corridor Widening", location: "Hyderabad - HITEC City", status: "completed", progress: 100, startDate: "2024-09-01", expectedEnd: "2025-11-30", contractor: "NCC Ltd", budget: "₹180 Cr" },
        { id: "R008", name: "Metro Feeder Road Network", location: "Chennai - OMR Stretch", status: "ongoing", progress: 30, startDate: "2025-09-15", expectedEnd: "2027-06-30", contractor: "Afcons Infrastructure", budget: "₹275 Cr" }
    ], null, 2));
}

// Routes
app.use('/api/complaints', complaintsRouter);
app.use('/api', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 CivicResolve API running on http://localhost:${PORT}`);
});
