import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    otp: String,
    otp_expires_at: Date,
    otp_verified: { type: Boolean, default: false },
}, { timestamps: true })

const userModel = mongoose.model('User', userSchema)

export default userModel