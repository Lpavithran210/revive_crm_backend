import moment from "moment-timezone";
import StudentModel from "../models/studentEnquiryModel.js";
import { formatStudentToIST } from "../utils/time.js";

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
            course: student.course,
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

     const start = moment.tz(startDate, "Asia/Kolkata")
        .startOf("day")
        .utc()
        .toDate();

    const end = moment.tz(endDate, "Asia/Kolkata")
        .endOf("day")
        .utc()
        .toDate();

    const enquiries = await StudentModel.find();
    const filtered = enquiries.filter(student => {
      if (!student.history || student.history.length === 0) return false;
      const latestHistory = student.history.reduce((latest, current) => {
        return new Date(current.updated_at) > new Date(latest.updated_at)
          ? current
          : latest;
      });
      const latestDate = new Date(latestHistory.updated_at);
      return latestDate >= start && latestDate <= end;
    });

    res.json(filtered);

  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({ error: "Server error" });
  }
};

import User from "../models/userModel.js";
import { getIO } from "../socket/socket.js";

export const updateStudent = async (req, res) => {
    const studentId = req.params.id;
    const { name, status, attender, note, follow_up_date, course_fee, amount, payment_mode, course } = req.body;

    try {

        const student = await StudentModel.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // ✅ GET USER ID FROM ATTENDER NAME
        let attenderId = student.attenderId;

        if (attender) {
            const user = await User.findOne({ name: attender });

            if (!user) {
                return res.status(400).json({ message: "Attender user not found" });
            } 
            attenderId = user._id;
            student.attender = attender;
            student.attenderId = attenderId;
        }
        if (!attenderId) {
        return res.status(400).json({
            message: "AttenderId missing. Cannot assign notification user."
        });
        }

        // Follow up validation
        if (status === "Follow up") {
            if (!note?.trim() || !follow_up_date || isNaN(new Date(follow_up_date).getTime())) {
                return res.status(400).json({
                    message: "Note and follow-up date are required!"
                });
            }
        }

        if (status === "Loss") {
            if (!note?.trim()) {
                return res.status(400).json({
                    message: "Note is required when marking lead as Loss!"
                });
            }
        }

        // ✅ UPDATE MAIN FIELDS
        if (name !== undefined) student.name = name;
        if (status) student.status = status;

        if (course) student.course = course;

        // ✅ HISTORY ENTRY
        const shouldUpdateHistory =
            status ||
            attender ||
            note ||
            follow_up_date ||
            course;

        if (shouldUpdateHistory) {

            student.history = student.history || [];

            student.history.push({
                updated_at: new Date(),
                status: student.status,
                attender: student.attender,
                attenderId: attenderId, // ✅ FIXED
                note: note || "Lead updated",
                follow_up_date: follow_up_date ? new Date(follow_up_date) : null,
                course: student.course,
                reminder_sent: false
            });
        }

        // ✅ PAYMENT LOGIC (unchanged)
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
        
        const formattedStudent = formatStudentToIST(student);
        const io = getIO();
        io.emit("newEnquiry", formattedStudent);

        return res.status(201).json({
            message: "Student created successfully",
            student: formattedStudent
        });

    } catch (error) {
        console.error("Create student error:", error);

        return res.status(500).json({
            message: "Failed to create student"
        });
    }
};