import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    attenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: { type: String, default: "Follow up" },
    data: Object,
    read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);