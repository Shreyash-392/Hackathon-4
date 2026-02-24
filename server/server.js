import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import complaintsRouter from './routes/complaints.js';
import aiRouter from './routes/ai.js';
import contractorsRouter from './routes/contractors.js';
import mongoose from 'mongoose';
import userRouter from './routes/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads (legacy fallback if Cloudinary is skipped occasionally)
const uploadsDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civic-resolve';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Initial data seeding (optional)
import Contractor from './models/Contractor.js';
const seedContractors = async () => {
    try {
        const count = await Contractor.countDocuments();
        if (count === 0) {
            await Contractor.insertMany([
                { id: "C001", name: "L&T Infrastructure", points: 1500, totalWorks: 45, qualityRating: 4.8 },
                { id: "C002", name: "Shapoorji Pallonji", points: 1250, totalWorks: 38, qualityRating: 4.6 },
                { id: "C003", name: "Gammon India", points: 980, totalWorks: 30, qualityRating: 4.2 },
                { id: "C004", name: "HCC Ltd", points: 1100, totalWorks: 32, qualityRating: 4.5 },
                { id: "C005", name: "NCC Ltd", points: 850, totalWorks: 28, qualityRating: 4.1 },
                { id: "C006", name: "Afcons Infrastructure", points: 1350, totalWorks: 40, qualityRating: 4.7 }
            ]);
            console.log('✅ Seeded Contractors');
        }
    } catch (err) {
        console.error('Failed to seed contractors:', err);
    }
};
seedContractors();

// Routes
app.use('/api/complaints', complaintsRouter);
app.use('/api/contractors', contractorsRouter);
app.use('/api/user', userRouter);
app.use('/api', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 CivicResolve API running on http://localhost:${PORT}`);
});
