import RoundRobinModel from "../models/roundRobinModel.js";
import userModel from "../models/userModel.js";

export const assignCounsellor = async () => {

    const counsellors = await userModel.find({
        role: "counsellor"
    }).sort({ createdAt: 1 });

    // if no counsellors
    if (!counsellors.length) {
        return "Unassigned";
    }

    // get tracker
    let tracker = await RoundRobinModel.findOne({
        key: "lead_assignment"
    });

    // create tracker first time
    if (!tracker) {
        tracker = await RoundRobinModel.create({
            key: "lead_assignment",
            lastAssignedIndex: -1
        });
    }

    // calculate next index
    const nextIndex =
        (tracker.lastAssignedIndex + 1) %
        counsellors.length;

    // update tracker
    tracker.lastAssignedIndex = nextIndex;

    await tracker.save();

    // return counsellor name
    return counsellors[nextIndex].name;
};