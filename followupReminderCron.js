import cron from 'node-cron';
import moment from "moment-timezone";
import StudentModel from './models/studentEnquiryModel.js';
import { io } from "./index.js";

cron.schedule('* * * * *', async () => {
    console.log("CRON RUNNING", new Date());

    const now = moment().tz("Asia/Kolkata").toDate();
    const lowerBound = new Date(now);
    const upperBound = new Date(lowerBound.getTime() + 10 * 60 * 1000);
    console.log("Searching between:", lowerBound, upperBound);
    try {
        const students = await StudentModel.find({
            "history.follow_up_date": {
                $gte: lowerBound,
                $lt: upperBound
            },
            "history.status": "Follow up",
            "history.reminder_sent": { $ne: true }
        });
        console.log("Students found:", students.length);

        for (const student of students) {
            let updated = false;

            for (const followup of student.history) {
                if (!followup.follow_up_date) continue;
                if (followup.reminder_sent) continue;
                const followupTime = new Date(followup.follow_up_date);

                if (
                    followup.status === 'Follow up' &&
                    followupTime >= lowerBound &&
                    followupTime < upperBound
                ) {
                    const attenderName = followup.attender || student.attender;
                    console.log("EMITTING FOLLOWUP SOCKET", student.name);
                    io.emit("followupReminder", {
                        name: student.name,
                        phone: student.phone,
                        course: student.course,
                        followupTime: followup.follow_up_date,
                        note: followup.note,
                        attender: attenderName
                    });

                    followup.reminder_sent = true;
                    updated = true;
                }
            }
            if (updated) {
                await student.save();
            }
        }
    } catch (error) {
        console.error('Error in follow-up reminder cron:', error);
    }
});