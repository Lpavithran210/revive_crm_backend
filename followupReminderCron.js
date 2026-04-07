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
      const validFollowups = student.history
        .filter(f =>
          f.follow_up_date &&
          !f.reminder_sent &&
          f.status === "Follow up"
        )
        .sort((a, b) => new Date(b.follow_up_date) - new Date(a.follow_up_date));

      const followup = validFollowups[0];

      if (!followup) continue;

      const followupTime = new Date(followup.follow_up_date);

      if (followupTime >= lowerBound && followupTime < upperBound) {

        const attenderId = followup.attenderId?.toString();
        const attenderName = followup.attender || student.attender;

        if (!attenderId) {
          console.log("⚠️ Missing attenderId, skipping...");
          continue;
        }

        console.log("🎯 CORRECT USER:", attenderId);

        const payload = {
          name: student.name,
          phone: student.phone,
          course: student.course,
          followupTime: followup.follow_up_date,
          note: followup.note,
          attenderId,
          attender: attenderName,
        };

        if (isUserOnline(attenderId)) {
          console.log("🟢 User ONLINE → emitting");

          io.to(attenderId).emit("followupReminder", payload);

        } else {
          console.log("🔴 User OFFLINE → saving");

          await notificationModel.create({
            attenderId: attenderId,
            data: payload,
            read: false,
          });
        }

        followup.reminder_sent = true;
        await student.save();
      }
    }

  } catch (error) {
    console.error("❌ Error in follow-up reminder cron:", error);
  }
});