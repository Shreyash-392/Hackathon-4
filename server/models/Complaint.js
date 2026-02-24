import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    trackingId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: 'Other' },
    priority: { type: String, default: 'medium' },
    status: { type: String, default: 'pending' },
    location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 },
        address: { type: String, default: '' },
        state: { type: String, default: '' },
        district: { type: String, default: '' },
        city: { type: String, default: '' },
        landmark: { type: String, default: '' }
    },
    photo: { type: String, default: null }, // URL from Cloudinary
    votes: { type: Number, default: 0 },
    votedIps: { type: [String], default: [] },
    department: { type: String, default: null },
    assignedContractorId: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    evaluatingDepartment: { type: String, default: null },
    statusHistory: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String
    }],
    aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });

export default mongoose.model('Complaint', complaintSchema);
