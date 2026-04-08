import express from 'express'
import { createStudent, getEnquiries, getNotifications, markNotificationsRead, updateStudent, uploadStudents } from '../controllers/studentController.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.js'
import protect from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/upload-students', protect, authorizeRoles('admin'), uploadStudents)

router.post('/automation/create-student', createStudent)

router.get("/notifications", protect, getNotifications);

router.patch("/notifications/read", protect, markNotificationsRead);

router.post('/create-student', protect, authorizeRoles('admin'), createStudent)

router.get('/enquiries', protect, getEnquiries)

router.put('/student/:id', protect, updateStudent);

export default router