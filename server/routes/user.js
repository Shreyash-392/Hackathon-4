import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET user wallet (requires userId as query param)
router.get('/wallet', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

        const user = await User.findOne({ userId });
        res.json({ success: true, wallet: { points: user ? user.points : 0 } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch wallet' });
    }
});

// ADD points to wallet (requires userId in body)
router.post('/wallet/add', async (req, res) => {
    try {
        const { userId, points } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ userId, points: 0 });
        }

        user.points += points || 0;
        await user.save();

        res.json({ success: true, wallet: { points: user.points } });
    } catch (err) {
        console.error('[user] wallet add error', err);
        res.status(500).json({ success: false, error: 'Failed to add points' });
    }
});

export default router;
