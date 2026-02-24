
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const usersFile = join(__dirname, '..', 'data', 'users.json');

function readUsers() {
    try {
        return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch {
        return {};
    }
}

function writeUsers(data) {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

// GET user wallet (requires userId as query param)
router.get('/wallet', (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });
        const users = readUsers();
        const user = users[userId] || { points: 0 };
        res.json({ success: true, wallet: { points: user.points } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch wallet' });
    }
});

// ADD points to wallet (requires userId in body)
router.post('/wallet/add', (req, res) => {
    try {
        const { userId, points } = req.body;
        if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });
        const users = readUsers();
        if (!users[userId]) users[userId] = { points: 0 };
        users[userId].points += points || 0;
        writeUsers(users);
        res.json({ success: true, wallet: { points: users[userId].points } });
    } catch (err) {
        console.error('[user] wallet add error', err);
        res.status(500).json({ success: false, error: 'Failed to add points' });
    }
});

export default router;
