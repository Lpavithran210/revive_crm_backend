import cron from 'node-cron';
import StudentModel from './models/studentEnquiryModel.js'
import { sendMail } from './email.js';
import userModel from './models/userModel.js';

cron.schedule('* * * * *', async () => {
    const now = new Date();
    const lowerBound = new Date(now.getTime() + 10 * 60 * 1000);
    const upperBound = new Date(lowerBound.getTime() + 60 * 1000);

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
                    const attenderUser = await userModel.findOne({ name: attenderName });
                    if (!attenderUser) continue;

                    const htmlContent = `
        <p>Hi ${attenderName},</p>
        <p>This is a reminder to follow up with:</p>
        <ul>
          <li><strong>Name:</strong> ${student.name}</li>
          <li><strong>Phone:</strong> ${student.phone}</li>
          <li><strong>Course:</strong> ${student.course}</li>
          <li><strong>Follow-up Time:</strong> ${new Date(followup.follow_up_date).toLocaleString()}</li>
        </ul>
        ${followup.note ? `<p><strong>Note:</strong> ${followup.note}</p>` : ''}
        <br/>
        <p>Regards,<br/>CRM System</p>
      `;

                    await sendMail(attenderUser.email, `🔔 Follow-up Reminder: ${student.name}`, htmlContent);
                    console.log(`Email sent to ${attenderUser.email} for ${student.name}`);

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
