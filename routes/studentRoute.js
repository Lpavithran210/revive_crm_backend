import express from 'express'
import { createStudent, getEnquiries, updateStudent, uploadStudents } from '../controllers/studentController.js'
import { authorizeRoles } from '../middlewares/authorizeRoles.js'
import protect from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/upload-students', protect, authorizeRoles('admin'), uploadStudents)

router.post('/create-student', protect, authorizeRoles('admin'), createStudent)

router.get('/enquiries', protect, getEnquiries)

router.put('/student/:id', protect, updateStudent);

export default router