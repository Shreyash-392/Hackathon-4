import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const dataFile = join(__dirname, '..', 'data', 'complaints.json');
const roadsFile = join(__dirname, '..', 'data', 'roads.json');
const contractorsFile = join(__dirname, '..', 'data', 'contractors.json');

// Multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = join(__dirname, '..', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${Date.now()}-${uuidv4().substring(0, 8)}.${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function readComplaints() {
    try {
        return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch { return []; }
}

function writeComplaints(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// CREATE complaint
router.post('/', upload.single('photo'), (req, res) => {
    try {
        const complaints = readComplaints();
        const trackingId = 'CIV-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().substring(0, 4).toUpperCase();

        const complaint = {
            id: uuidv4(),
            trackingId,
            title: req.body.title || '',
            description: req.body.description || '',
            category: req.body.category || 'Other',
            priority: req.body.priority || 'medium',
            status: 'pending',
            location: {
                lat: parseFloat(req.body.lat) || 0,
                lng: parseFloat(req.body.lng) || 0,
                address: req.body.address || '',
                state: req.body.state || '',
                district: req.body.district || '',
                city: req.body.city || '',
                landmark: req.body.landmark || '',
            },
            photo: req.file ? `/uploads/${req.file.filename}` : null,
            votes: 0,
            votedIps: [],
            department: null,
            assignedContractorId: null,
            assignedAt: null,
            evaluatingDepartment: null,
            statusHistory: [
                { status: 'pending', timestamp: new Date().toISOString(), note: 'Complaint registered successfully' }
            ],
            aiAnalysis: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        complaints.push(complaint);
        writeComplaints(complaints);

        res.status(201).json({ success: true, complaint, trackingId });
    } catch (err) {
        console.error('Create complaint error:', err);
        res.status(500).json({ success: false, error: 'Failed to create complaint' });
    }
});

// GET all complaints (with filters)
router.get('/', (req, res) => {
    try {
        let complaints = readComplaints();
        const { category, status, priority, search, sort } = req.query;

        if (category && category !== 'all') complaints = complaints.filter(c => c.category === category);
        if (status && status !== 'all') complaints = complaints.filter(c => c.status === status);
        if (priority && priority !== 'all') complaints = complaints.filter(c => c.priority === priority);
        if (search) {
            const s = search.toLowerCase();
            complaints = complaints.filter(c =>
                c.title.toLowerCase().includes(s) ||
                c.description.toLowerCase().includes(s) ||
                c.location.address.toLowerCase().includes(s) ||
                c.trackingId.toLowerCase().includes(s)
            );
        }

        if (sort === 'votes') complaints.sort((a, b) => b.votes - a.votes);
        else if (sort === 'priority') {
            const p = { high: 3, medium: 2, low: 1 };
            complaints.sort((a, b) => (p[b.priority] || 0) - (p[a.priority] || 0));
        }
        else complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, complaints, total: complaints.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
    }
});

// GET single complaint by tracking ID
router.get('/track/:trackingId', (req, res) => {
    const complaints = readComplaints();
    const complaint = complaints.find(c => c.trackingId === req.params.trackingId);
    if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });
    res.json({ success: true, complaint });
});

// GET analytics
router.get('/analytics/stats', (req, res) => {
    const complaints = readComplaints();
    const total = complaints.length;
    const byStatus = { pending: 0, 'in-progress': 0, resolved: 0, reopened: 0 };
    const byCategory = {};
    const byPriority = { low: 0, medium: 0, high: 0 };

    complaints.forEach(c => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
        byCategory[c.category] = (byCategory[c.category] || 0) + 1;
        byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    });

    const hotspots = complaints
        .filter(c => c.location.lat && c.location.lng)
        .map(c => ({ lat: c.location.lat, lng: c.location.lng, title: c.title, category: c.category }));

    res.json({ success: true, stats: { total, byStatus, byCategory, byPriority, hotspots } });
});

// GET roads
router.get('/roads/list', (req, res) => {
    try {
        const roads = JSON.parse(fs.readFileSync(roadsFile, 'utf8'));
        const { status } = req.query;
        if (status && status !== 'all') {
            return res.json({ success: true, roads: roads.filter(r => r.status === status) });
        }
        res.json({ success: true, roads });
    } catch {
        res.json({ success: true, roads: [] });
    }
});

// VOTE on a complaint
router.put('/:id/vote', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    complaints[idx].votes += 1;
    complaints[idx].updatedAt = new Date().toISOString();
    writeComplaints(complaints);
    res.json({ success: true, votes: complaints[idx].votes });
});

// UPDATE status (admin)
router.put('/:id/status', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    const { status, note, department, contractorId, evaluatingDepartment } = req.body;
    complaints[idx].status = status;
    if (department) complaints[idx].department = department;

    // Assignment logic
    if (contractorId) {
        complaints[idx].assignedContractorId = contractorId;
        complaints[idx].assignedAt = new Date().toISOString();
    }
    if (evaluatingDepartment) {
        complaints[idx].evaluatingDepartment = evaluatingDepartment;
    }

    complaints[idx].statusHistory.push({
        status,
        timestamp: new Date().toISOString(),
        note: note || `Status updated to ${status}`
    });
    complaints[idx].updatedAt = new Date().toISOString();
    writeComplaints(complaints);
    res.json({ success: true, complaint: complaints[idx] });
});

// EVALUATE contractor (admin)
router.post('/:id/evaluate', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Complaint Not found' });

    const complaint = complaints[idx];
    if (!complaint.assignedContractorId) return res.status(400).json({ success: false, error: 'No contractor assigned' });

    const { points, feedback } = req.body;

    // Update Contractor
    let contractors = [];
    try {
        contractors = JSON.parse(fs.readFileSync(contractorsFile, 'utf8'));
    } catch { contractors = []; }

    const cIdx = contractors.findIndex(c => c.id === complaint.assignedContractorId);
    if (cIdx !== -1) {
        contractors[cIdx].points += (points || 0);
        contractors[cIdx].totalWorks += 1;
        fs.writeFileSync(contractorsFile, JSON.stringify(contractors, null, 2));
    }

    // Mark evaluated on complaint
    complaint.statusHistory.push({
        status: 'evaluated',
        timestamp: new Date().toISOString(),
        note: `Contractor Evaluated. Feedback: ${feedback || 'None'} (${points > 0 ? '+' + points : points} pts)`
    });
    writeComplaints(complaints);
    res.json({ success: true, complaint });
});

// REOPEN complaint
router.put('/:id/reopen', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    complaints[idx].status = 'reopened';
    complaints[idx].statusHistory.push({
        status: 'reopened',
        timestamp: new Date().toISOString(),
        note: req.body.reason || 'Complaint reopened by citizen'
    });
    complaints[idx].updatedAt = new Date().toISOString();
    writeComplaints(complaints);
    res.json({ success: true, complaint: complaints[idx] });
});

// SAVE AI analysis to complaint
router.put('/:id/analysis', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    complaints[idx].aiAnalysis = req.body.analysis;
    complaints[idx].updatedAt = new Date().toISOString();
    writeComplaints(complaints);
    res.json({ success: true, complaint: complaints[idx] });
});

// DELETE complaint by id
router.delete('/:id', (req, res) => {
    const complaints = readComplaints();
    const idx = complaints.findIndex(c => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });

    const [removed] = complaints.splice(idx, 1);
    writeComplaints(complaints);

    console.log('[complaints] deleted', req.params.id);

    // remove associated photo file if it exists and is local
    if (removed.photo && removed.photo.startsWith('/uploads/')) {
        const photoPath = join(__dirname, '..', removed.photo);
        fs.unlink(photoPath, err => { /* ignore error */ });
    }

    res.json({ success: true });
});

// (dev helper) remove the most recently created complaint
router.delete('/latest', (req, res) => {
    let complaints = readComplaints();
    if (complaints.length === 0) return res.json({ success: false, error: 'No complaints' });

    // find by createdAt newest
    complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const removed = complaints.shift();
    writeComplaints(complaints);

    if (removed.photo && removed.photo.startsWith('/uploads/')) {
        const photoPath = join(__dirname, '..', removed.photo);
        fs.unlink(photoPath, () => {});
    }

    res.json({ success: true, removed });
});

export default router;
