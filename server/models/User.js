import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    points: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
