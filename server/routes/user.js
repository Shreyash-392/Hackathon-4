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
    } catch { return { points: 0 }; } // Return a default user wallet object
}

function writeUsers(data) {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

// GET user wallet
router.get('/wallet', (req, res) => {
    try {
        const user = readUsers();
        res.json({ success: true, wallet: { points: user.points || 0 } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch wallet' });
    }
});

// ADD points to wallet
router.post('/wallet/add', (req, res) => {
    try {
        const { points } = req.body;
        console.log('[user] adding points', points);
        const user = readUsers();
        user.points = (user.points || 0) + (points || 0);
        writeUsers(user);
        res.json({ success: true, wallet: { points: user.points } });
    } catch (err) {
        console.error('[user] wallet add error', err);
        res.status(500).json({ success: false, error: 'Failed to add points' });
    }
});

export default router;
