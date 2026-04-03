import express from 'express'
import { createStudent, getDueFollowups, getEnquiries, lockReminder, markReminderSent, updateStudent, uploadStudents } from '../controllers/studentController.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.js'
import protect from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/upload-students', protect, authorizeRoles('admin'), uploadStudents)

router.post('/automation/create-student', createStudent)

router.post('/create-student', protect, authorizeRoles('admin'), createStudent)

router.get('/due-followups', getDueFollowups);

router.put('/lock-reminder/:studentId/:followupId', lockReminder);

router.put('/mark-reminder-sent/:studentId/:followupId', markReminderSent);

router.get('/enquiries', protect, getEnquiries)

router.put('/student/:id', protect, updateStudent);

export default router