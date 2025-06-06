import express from 'express'
import { createCourse, deleteCourse, getAllCourses } from '../controllers/courseController.js'
import protect from '../middlewares/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getAllCourses)
router.post('/add_course', protect, createCourse)
router.delete('/:id', protect, deleteCourse)

export default router