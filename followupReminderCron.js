import cron from "node-cron";
import moment from "moment-timezone";
import StudentModel from "./models/studentEnquiryModel.js";
import { getIO, isUserOnline } from "./socket/socket.js";
import notificationModel from "./models/notificationModel.js";

cron.schedule("* * * * *", async () => {
    console.log("⏰ CRON RUNNING:", new Date());

    const now = moment().tz("Asia/Kolkata").toDate();

    const lowerBound = new Date(now);
    const upperBound = new Date(lowerBound.getTime() + 10 * 60 * 1000);

    console.log("🔍 Searching between:", lowerBound, upperBound);

    try {
        const io = getIO();

        const students = await StudentModel.find({
            history: {
                $elemMatch: {
                    follow_up_date: {
                        $gte: lowerBound,
                        $lt: upperBound,
                    },
                    status: "Follow up",
                    reminder_sent: { $ne: true },
                },
            },
        });

        console.log("📦 Students found:", students.length);

        for (const student of students) {

            const followups = student.history.filter(f => {
                if (!f.follow_up_date) return false;
                if (f.reminder_sent) return false;
                if (f.status !== "Follow up") return false;

                const time = new Date(f.follow_up_date);

                return time >= lowerBound && time < upperBound;
            });

            if (followups.length === 0) continue;

            console.log(`📌 ${followups.length} followups for student ${student.name}`);

            for (const followup of followups) {

                const attenderId = followup.attenderId?.toString();
                const attenderName = followup.attender || student.attender;

                if (!attenderId) {
                    console.log("⚠️ Missing attenderId, skipping...");
                    continue;
                }

                console.log("🎯 Sending to:", attenderId);

                const lastFollowup = student.history
                .filter(h =>
                    h.status === "Follow up" &&
                    h.updated_at &&
                    new Date(h.updated_at) < now
                )
                .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;

                const payload = {
                    name: student.name,
                    phone: student.phone,
                    course: student.course,
                    followupTime: followup.follow_up_date,
                    note: followup.note,
                    attenderId,
                    attender: attenderName,
                    lastFollowupDate: lastFollowup?.updated_at || null,
                };

                const notification = await notificationModel.create({
                    attenderId,
                    data: payload,
                    read: false,
                });

                if (isUserOnline(attenderId)) {
                    console.log("🟢 ONLINE → emitting");
                    io.to(attenderId).emit("followupReminder", notification);
                } else {
                    console.log("🔴 OFFLINE → stored in DB");
                }
                followup.reminder_sent = true;
            }
            await student.save();
        }

    } catch (error) {
        console.error("❌ Error in follow-up reminder cron:", error);
    }
});