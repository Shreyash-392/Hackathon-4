import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import Complaint from '../models/Complaint.js';
import Contractor from '../models/Contractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'civic-resolve-complaints',
        allowed_formats: ['jpg', 'png', 'jpeg', 'heic'],
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Roads file (keep this local for now as it's static data)
const roadsFile = join(__dirname, '..', 'data', 'roads.json');

// CREATE complaint
router.post('/', upload.single('photo'), async (req, res) => {
    try {
        const trackingId = 'CIV-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().substring(0, 4).toUpperCase();

        const complaint = new Complaint({
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
            // The file url comes from Cloudinary now
            photo: req.file ? req.file.path : null,
            statusHistory: [
                { status: 'pending', note: 'Complaint registered successfully' }
            ]
        });

        await complaint.save();
        res.status(201).json({ success: true, complaint, trackingId });
    } catch (err) {
        console.error('Create complaint error:', err.message || err);
        res.status(500).json({ success: false, error: 'Failed to create complaint', details: err.message || String(err) });
    }
});

// GET all complaints (with filters)
router.get('/', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { category, status, priority, search, sort } = req.query;
        let query = {};

        if (category && category !== 'all') query.category = category;
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        if (search) {
            const s = new RegExp(search, 'i');
            query.$or = [
                { title: s },
                { description: s },
                { 'location.address': s },
                { trackingId: s }
            ];
        }

        let sortOption = { createdAt: -1 }; // default newest
        if (sort === 'votes') sortOption = { votes: -1 };
        else if (sort === 'priority') {
            // Need to sort by high, medium, low. In mongo, it's easier to fetch and sort or use aggregation, 
            // but for simplicity, let's fetch, sort in memory if needed. Priority is rare.
            sortOption = { priority: 1, createdAt: -1 }; // Alphabetical: high, low, medium - wait not ideal.
        }

        let complaints = await Complaint.find(query).sort(sortOption).lean();

        // Fix priority sort in memory since it's an enum
        if (sort === 'priority') {
            const p = { high: 3, medium: 2, low: 1 };
            complaints.sort((a, b) => (p[b.priority] || 0) - (p[a.priority] || 0));
        }

        res.json({ success: true, complaints, total: complaints.length });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch complaints' });
    }
});

// GET single complaint by tracking ID
router.get('/track/:trackingId', async (req, res) => {
    try {
        const complaint = await Complaint.findOne({ trackingId: req.params.trackingId }).lean();
        if (!complaint) return res.status(404).json({ success: false, error: 'Complaint not found' });
        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET analytics
router.get('/analytics/stats', async (req, res) => {
    try {
        const complaints = await Complaint.find().lean();
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
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// GET roads (static json data)
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
router.put('/:id/vote', async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { $inc: { votes: 1 } },
            { new: true }
        );
        if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, votes: complaint.votes });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// UPDATE status (admin)
router.put('/:id/status', async (req, res) => {
    try {
        const { status, note, department, contractorId, evaluatingDepartment } = req.body;

        let updateData = { status };
        if (department) updateData.department = department;
        if (contractorId) {
            updateData.assignedContractorId = contractorId;
            updateData.assignedAt = new Date();
        }
        if (evaluatingDepartment) {
            updateData.evaluatingDepartment = evaluatingDepartment;
        }

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                $set: updateData,
                $push: {
                    statusHistory: {
                        status,
                        note: note || `Status updated to ${status}`
                    }
                }
            },
            { new: true }
        );

        if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// EVALUATE contractor (admin)
router.post('/:id/evaluate', async (req, res) => {
    try {
        const { points, feedback } = req.body;

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, error: 'Complaint Not found' });
        if (!complaint.assignedContractorId) return res.status(400).json({ success: false, error: 'No contractor assigned' });

        // Update Contractor
        await Contractor.findOneAndUpdate(
            { id: complaint.assignedContractorId },
            {
                $inc: { points: (points || 0), totalWorks: 1 }
            }
        );

        // Mark evaluated on complaint
        complaint.statusHistory.push({
            status: 'evaluated',
            note: `Contractor Evaluated. Feedback: ${feedback || 'None'} (${points > 0 ? '+' + points : points} pts)`
        });
        await complaint.save();

        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// REOPEN complaint
router.put('/:id/reopen', async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                $set: { status: 'reopened' },
                $push: {
                    statusHistory: {
                        status: 'reopened',
                        note: req.body.reason || 'Complaint reopened by citizen'
                    }
                }
            },
            { new: true }
        );
        if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// SAVE AI analysis to complaint
router.put('/:id/analysis', async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { $set: { aiAnalysis: req.body.analysis } },
            { new: true }
        );
        if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, complaint });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// DELETE complaint by id
router.delete('/:id', async (req, res) => {
    try {
        const complaint = await Complaint.findByIdAndDelete(req.params.id);
        if (!complaint) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// (dev helper) remove the most recently created complaint
router.delete('/latest', async (req, res) => {
    try {
        const latest = await Complaint.findOne().sort({ createdAt: -1 });
        if (!latest) return res.json({ success: false, error: 'No complaints' });

        await Complaint.findByIdAndDelete(latest._id);
        res.json({ success: true, removed: latest });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

export default router;
