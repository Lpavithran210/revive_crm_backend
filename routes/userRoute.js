import express from 'express'
import { loginUser, forgotPassword, verifyOTP, resetPassword, createUser, getAllMembers, deleteUser } from '../controllers/userController.js'
import protect from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/forgotpassword', forgotPassword)

router.post('/verify_otp', verifyOTP)

router.post('/reset_password', resetPassword);

router.post('/signin', loginUser)

router.post('/add_user', protect, createUser)

router.get('/members', protect, getAllMembers)

router.delete('/:id', protect, deleteUser)

export default router