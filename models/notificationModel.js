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

notificationSchema.index({ attenderId: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);