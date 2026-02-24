import express from 'express';
import Contractor from '../models/Contractor.js';

const router = express.Router();

// GET all contractors (sorted by ranking)
router.get('/', async (req, res) => {
    try {
        const contractors = await Contractor.find().sort({ points: -1 });
        res.json({ success: true, contractors });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch contractors' });
    }
});

export default router;
