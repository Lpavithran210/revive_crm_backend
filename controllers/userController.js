import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import userModel from "../models/userModel.js";
import { sendMail } from '../email.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;


export const createUser = async (req, res) => {
    const {name, email, password, role} = req.body

    try{
        const user = await userModel.findOne({ email })
        
        if(user) {
            return res.status(400).json({message:"Email is already registered"})
        }
        
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = await userModel.create({name, email, password: hashedPassword, role})
        return res.json({message: 'User added successfully', user: newUser})
    } catch (e) {
        console.log(e.message)
    }
}

export const loginUser = async (req, res) => {
    const email = req.body.email.trim()
    const password = req.body.password.trim()

    const validEmail = emailRegex.test(email)
    const validPassword = passwordRegex.test(password)

    try {
        if (!validEmail) {
            res.status(400)
            throw new Error("Please enter a valid email")
        }
        if (!validPassword) {
            res.status(400)
            throw new Error("Password must contain 8 chars and must contain 1 number, 1 special character, 1 uppercase and 1 lowercase letter")
        }
        const user = await userModel.findOne({ email })
        if (!user) {
            res.status(400)
            throw new Error("Email not registered")
        }
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ message: "User login successfull", data: {accessToken: generateToken(user._id, user.role), role: user.role, name: user.name}})
        } else {
            res.status(400)
            throw new Error("Invalid password")
        }
    } catch (e) {
        console.log(e.message)
        res.status(400).json({ message: e.message })
    }
}


export const getAllMembers = async (req, res) => {
    const data = await userModel.find()
    res.json({data: data})
}

export const deleteUser = async (req, res) => {
    const userId = req.params.id;
    try {
        await userModel.findByIdAndDelete(userId);
        res.json({message: 'User deleted successfully'})
    } catch (e) {
        res.status(500).json({message: 'Something went wrong'})
    }
}

export const getUserDetails = async (req, res) => {
    const {name} = req.params
    const data = await userModel.findOne({name})
    res.json({data: data})
}

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const validEmail = emailRegex.test(email);
    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        if (!validEmail) {
            return res.status(400).json({ message: "Please enter a valid email" });
        }
        
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email not registered" });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const salt = await bcrypt.genSalt(10);
        const hashedOTP = await bcrypt.hash(otp, salt);
        const otpExpiry = new Date();
        otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

        await userModel.findOneAndUpdate(
            { email },
            { otp: hashedOTP, otp_expires_at: otpExpiry }
        );

        res.render('otp', { otp, name: user.name }, async (err, html) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ message: "Error rendering template" });
            }
            try {
                await sendMail(email, "Forgot Password Request - Your OTP Code", html);
                return res.json({ message: "OTP has been sent successfully" });
            } catch (error) {
                console.log(error);
                return res.status(400).json({ message: "Error sending email" });
            }
        });

    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export const verifyOTP = async (req, res) => {
    const {email, otp} = req.body
    if(!email) {
        res.status(400).json({message: 'Email is required!'})
    }
    const user = await userModel.findOne({email})
    const isMatch = await bcrypt.compare(otp, user?.otp)
    const currentTime = new Date()
    if(isMatch){
        if(currentTime <= user.otp_expires_at){
            await userModel.findByIdAndUpdate(user._id, { otp_verified: true });
            return res.json({message: "OTP verified"})
        } else {
            return res.status(400).json({message: "OTP is expired"})
        }
    }
    else{
        res.status(400).json({message: 'Wrong OTP'})
    }
}

export const resetPassword = async (req, res) => {
    
    const { email, password } = req.body;
    const validPassword = passwordRegex.test(password);

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }
        if (!validPassword) {
            return res.status(400).json({ message: "Password must contain 8 chars and must contain 1 number, 1 special character, 1 uppercase and 1 lowercase letter" });
        }

        const user = await userModel.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        if (!user.otp_verified) {
            return res.status(400).json({ message: "OTP not verified. Please verify OTP before resetting password." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await userModel.findByIdAndUpdate(user._id, { 
            $set: { 
                password: hashedPassword,
                otp: null,
                otp_expires_at: null,
                otp_verified: false
            }
        });

        return res.json({ message: "Password reset successfully" });

    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "6h" })
}