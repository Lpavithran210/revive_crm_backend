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

const cleanPhoneNumber = (phone) => {
    if (!phone) return '';

    if (phone.startsWith('+91')) {
        return phone.slice(3);
    }

    return phone;
};

const normalizeLearningMode = (mode) => {
    if (!mode) return '';

    const lowerMode = mode.toLowerCase();
    if (lowerMode === 'online') return 'Online';
    if (lowerMode === 'offline') return 'Offline';

    return '';
};

const normalizeWorkingIn = (workingIn) => {
    if (!workingIn) return '';

    const lowerWorkingIn = workingIn.trim().toLowerCase();

    if (lowerWorkingIn.includes('non')) return 'Non IT';
    if (lowerWorkingIn.includes('it')) return 'IT';

    return '';
};

export const uploadStudents = async (req, res) => {

    try {
        const { students } = req.body;
        const formattedStudents = students.map((student) => ({
            name: student["Full name"],
            phone: cleanPhoneNumber(student["Phone number"]),
            course: extractCourseName(student["Form Name"]),
            are_you: student["Are you?"] === "Experience" ? "Experienced" : "Fresher",
            currently_working_in: normalizeWorkingIn(student["Are you currently working in?"]),
            learning_mode: normalizeLearningMode(student["Which is your preferred mode of learning?"]),
            status: 'Pending',
            created_at: new Date(student['Created Time']).toISOString(),
        }));
        await StudentModel.insertMany(formattedStudents);
        res.status(200).json({ message: 'Students uploaded successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload students' });
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
                { updated_at: { $gte: start, $lte: end } },
                { history: { $elemMatch: { updated_at: { $gte: start, $lte: end } } } }
            ]
        });

        // 2. Filter by main updated_at or any history.updated_at
        const filteredEnquiries = enquiries.filter(student => {
            const mainUpdated = new Date(student.updated_at);
            if (mainUpdated >= start && mainUpdated <= end) {
                return true;
            }

            // Check history dates
            return student.history?.some(entry => {
                const historyDate = new Date(entry.updated_at);
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
            return res.status(404).json({ message: 'Student not found' });
        }

        if (status === 'Follow up') {
            if (!note?.trim() || !follow_up_date || isNaN(new Date(follow_up_date).getTime())) {
                return res.status(400).json({ message: 'Note and follow-up date are required!' });
            }
        }

        const shouldUpdateHistory = 
            (status && status !== student.status) ||
            (attender && attender !== student.attender) ||
            note ||
            follow_up_date;

        if (shouldUpdateHistory) {
            student.history = student.history || [];
            student.history.push({
                updated_at: new Date(),
                status: student.status,
                attender: student.attender,
                note: note,
                follow_up_date: follow_up_date ? new Date(follow_up_date) : undefined
            });
        }

        if (amount && payment_mode) {
            student.payments = student.payments || [];
            student.payments.push({
                paid_amount: Number(amount),
                payment_mode,
                payment_date: new Date(),
            });

            const totalPaid = student.payments.reduce((sum, payment) => sum + payment.paid_amount, 0);
            student.course_fee = Number(course_fee || student.course_fee);
            student.balance_amount = Math.max(student.course_fee - totalPaid, 0);

            if (student.balance_amount === 0) {
                student.payment_status = 'Fully Paid';
            } else if (student.balance_amount > 0 && totalPaid > 0) {
                student.payment_status = 'Partially Paid';
            } else {
                student.payment_status = 'Unpaid';
            }
        }

        if (status) student.status = status;
        if (attender) student.attender = attender;

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
};


export const createStudent = async (req, res) => {
    console.log(req.body)
    try {
        const { name, phone, course, course_fee, are_you, currently_working_in, learning_mode, source, status, attender, follow_up_date, note, payments = [], paid_amount = 0, balance_amount = 0, payment_status = "Unpaid" } = req.body;
        const student = await StudentModel.create({ name, phone, course, course_fee, are_you, currently_working_in, learning_mode, source, status, attender, follow_up_date, note, payments, paid_amount, balance_amount, payment_status });
        res.status(201).json({ message: 'Students created successfully', student });
    } catch (error) {
        console.error("Create student error:", error);
        res.status(500).json({ error: 'Failed to create student' });
    }
};
