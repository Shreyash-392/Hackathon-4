import mongoose from 'mongoose';

const contractorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    points: { type: Number, default: 0 },
    totalWorks: { type: Number, default: 0 },
    qualityRating: { type: Number, default: 0 }
});

export default mongoose.model('Contractor', contractorSchema);
