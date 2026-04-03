import cron from 'node-cron';
import StudentModel from './models/studentEnquiryModel.js'
import { io } from "./index.js";

cron.schedule('* * * * *', async () => {
    console.log("CRON RUNNING", new Date());
    const now = new Date();
    const lowerBound = new Date(now.getTime());
    const upperBound = new Date(lowerBound.getTime() + 10 * 60 * 1000);
    console.log("Searching between:", lowerBound, upperBound);
    try {
        const students = await StudentModel.find({
            history: {
                $elemMatch: {
                    follow_up_date: {
                        $gte: lowerBound,
                        $lt: upperBound
                    },
                    status: 'Follow up',
                    reminder_sent: { $ne: true }
                }
            }
        });
        console.log("Students found:", students.length);
        
        for (const student of students) {
            let updated = false;

            for (const followup of student.history) {
                const followupTime = new Date(followup.follow_up_date);

                if (
                    followup.status === 'Follow up' &&
                    !followup.reminder_sent &&
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

                    console.log(`Reminder emitted for ${student.name}`);

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