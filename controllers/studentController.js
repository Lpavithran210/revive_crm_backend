import { io } from "../index.js";
import StudentModel from "../models/studentEnquiryModel.js";

const extractCourseName = (formName) => {
    if (!formName) return '';

    const coursePatterns = ['Software Testing', 'Data Analytics', 'MERN Stack Development'];

    const lowerFormName = formName.toLowerCase();

    for (let course of coursePatterns) {
        if (lowerFormName.includes(course.toLowerCase())) {
            return course;
        }
    }

    return 'Unknown';
};

export const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.toString().replace(/^p:/i, '').replace(/\D/g, '').slice(-10);
};

const normalizeWorkingIn = (workingIn) => {
    if (!workingIn) return '';

    const lowerWorkingIn = workingIn.trim().toLowerCase();

    if (lowerWorkingIn.includes('non')) return 'Non IT';
    if (lowerWorkingIn.includes('it')) return 'IT';

    return '';
};

export const uploadStudents = async (req, res) => {
  const { students } = req.body;
  console.log('Received students for upload:', students);
  const formattedStudents = students
    .map((student) => ({
      name: student.name,
      phone: student.phone,
      learning_mode: student.learning_mode,
      course: student.course,
      qualification: student.qualification,
      city: student.city,
      source: student.source,
      status: "Pending",
      attender: "Unassigned",
      history: [
        {
            status: "Pending",
            attender: "Unassigned",
            note: "Enquiry Created",
            updated_at: new Date(),
            reminder_sent: false
        }
      ],
      course_fee: student.course_fee || 0,
      payments: student.payments || [],
      paid_amount: student.paid_amount || 0,
      balance_amount: student.balance_amount || 0,
      payment_status: student.payment_status || "Unpaid",
    }))
    .filter((student) => student.phone);

    const uniqueStudents = Object.values(
    formattedStudents.reduce((acc, student) => {
        acc[student.phone] = student;
        return acc;
        }, {})
    );

  try {
    await StudentModel.insertMany(uniqueStudents, {ordered: false});

    return res.status(200).json({
      message: "Students uploaded successfully",
      insertedCount: uniqueStudents.length,
      skipped: students.length - uniqueStudents.length
    });

  } catch (error) {

    if (error.writeErrors) {
      return res.status(200).json({
        message: "Students uploaded with some duplicates skipped",
        skipped: error.writeErrors.length
      });
    }

    console.error(error);
    return res.status(500).json({
      error: "Failed to upload students"
    });
  }
};

export const getEnquiries = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const enquiries = await StudentModel.find({
            $or: [
                { updatedAt: { $gte: start, $lte: end } },
                { history: { $elemMatch: { updatedAt: { $gte: start, $lte: end } } } }
            ]
        });

        // 2. Filter by main updated_at or any history.updated_at
        const filteredEnquiries = enquiries.filter(student => {
            const mainUpdated = new Date(student.updatedAt);
            if (mainUpdated >= start && mainUpdated <= end) {
                return true;
            }

            // Check history dates
            return student.history?.some(entry => {
                const historyDate = new Date(entry.updatedAt);
                return historyDate >= start && historyDate <= end;
            });
        });

        res.json(filteredEnquiries);
    } catch (error) {
        console.error('Error fetching enquiries by date:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateStudent = async (req, res) => {
    const studentId = req.params.id;
    const { status, attender, note, follow_up_date, course_fee, amount, payment_mode } = req.body;

    try {

        const student = await StudentModel.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Follow up validation
        if (status === "Follow up") {
            if (!note?.trim() || !follow_up_date || isNaN(new Date(follow_up_date).getTime())) {
                return res.status(400).json({
                    message: "Note and follow-up date are required!"
                });
            }
        }

        // Update main fields first
        if (status) student.status = status;
        if (attender) student.attender = attender;

        // Add history entry
        const shouldUpdateHistory =
            status ||
            attender ||
            note ||
            follow_up_date;

        if (shouldUpdateHistory) {

            student.history = student.history || [];

            student.history.push({
                updated_at: new Date(),
                status: student.status,
                attender: student.attender,
                note: note || "Lead updated",
                follow_up_date: follow_up_date ? new Date(follow_up_date) : null
            });

        }

        // Payment handling
        if (amount && payment_mode) {

            student.payments = student.payments || [];

            student.payments.push({
                paid_amount: Number(amount),
                payment_mode,
                payment_date: new Date()
            });

            if (course_fee) {
                student.course_fee = Number(course_fee);
            }

            const totalPaid = student.payments.reduce(
                (sum, payment) => sum + payment.paid_amount,
                0
            );

            student.balance_amount = Math.max(student.course_fee - totalPaid, 0);

            if (student.balance_amount === 0) {
                student.payment_status = "Fully Paid";
            }
            else if (totalPaid > 0) {
                student.payment_status = "Partially Paid";
            }
            else {
                student.payment_status = "Unpaid";
            }

        }

        const updatedStudent = await student.save();

        res.status(200).json(updatedStudent);

    } catch (error) {

        console.error("Error updating student:", error);

        res.status(500).json({
            message: "Error updating student",
            error: error.message
        });

    }
};

export const createStudent = async (req, res) => {
    try {
        if (!req.user) {
            const authHeader = req.headers.authorization;

            if (
                !authHeader ||
                authHeader.trim() !== `Bearer ${process.env.N8N_SECRET}`.trim()
            ) {
                return res.status(401).json({
                    message: "Unauthorized - Invalid or missing token"
                });
            }
        }

        const {
            name,
            phone,
            course,
            city,
            course_fee = 0,
            source,
            status = "Pending",
            attender = "Unassigned",
            follow_up_date,
            note,
            payments = [],
            paid_amount = 0,
            balance_amount = 0,
            payment_status = "Unpaid",
            qualification = "Not Specified"
        } = req.body;


        if (!name || !phone || !course) {
            return res.status(400).json({
                message: "Name, phone and course are required"
            });
        }

        const existingStudent = await StudentModel.findOne({ phone });

        if (existingStudent) {
            return res.status(200).json({
                message: "Student already exists"
            });
        }

        const student = await StudentModel.create({
            name,
            phone,
            course,
            city,
            course_fee,
            source,
            status,
            attender,
            follow_up_date,
            note,
            payments,
            paid_amount,
            balance_amount,
            payment_status,
            qualification
        });

        io.emit("new-enquiry", student);

        return res.status(201).json({
            message: "Student created successfully",
            student
        });

    } catch (error) {
        console.error("Create student error:", error);

        return res.status(500).json({
            message: "Failed to create student"
        });
    }
};

export const getDueFollowups = async (req, res) => {
  try {
    const now = new Date();
    const upper = new Date(now.getTime() + 10 * 60 * 1000);

    const students = await StudentModel.find({
      history: {
        $elemMatch: {
          status: "Follow up",
          reminder_sent: false,
          reminder_locked: false,
          follow_up_date: {
            $gte: now,
            $lte: upper
          }
        }
      }
    });

    const followups = [];

    students.forEach(student => {
      student.history.forEach(entry => {
        if (
          entry.status === "Follow up" &&
          !entry.reminder_sent &&
          !entry.reminder_locked &&
          entry.follow_up_date >= now &&
          entry.follow_up_date <= upper
        ) {
          followups.push({
            studentId: student._id,
            followupId: entry._id,
            name: student.name,
            phone: student.phone,
            course: student.course,
            time: entry.follow_up_date,
            note: entry.note
          });
        }
      });
    });

    console.log("FOLLOWUPS FOUND:", followups.length);

    res.json(followups);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching followups" });
  }
};

export const lockReminder = async (req, res) => {
  try {
    const { studentId, followupId } = req.params;

    const student = await StudentModel.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const followup = student.history.id(followupId);
    if (!followup) return res.status(404).json({ message: "Followup not found" });

    if (followup.reminder_locked) {
      return res.status(200).json({ message: "Already locked" });
    }

    followup.reminder_locked = true;
    await student.save();

    res.json({ message: "Locked successfully" });

  } catch (error) {
    res.status(500).json({ message: "Lock failed" });
  }
};

export const markReminderSent = async (req, res) => {
  try {
    const { studentId, followupId } = req.params;

    const student = await StudentModel.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const followup = student.history.id(followupId);
    if (!followup) return res.status(404).json({ message: "Followup not found" });

    followup.reminder_sent = true;
    followup.reminder_locked = false;

    await student.save();

    res.json({ message: "Reminder marked as sent" });

  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};