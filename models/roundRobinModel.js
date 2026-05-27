import mongoose from "mongoose";

const roundRobinSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true
        },

        lastAssignedIndex: {
            type: Number,
            default: -1
        }
    },
    {
        timestamps: true
    }
);

const RoundRobinModel = mongoose.model(
    "RoundRobin",
    roundRobinSchema
);

export default RoundRobinModel;