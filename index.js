import express from "express";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import cors from 'cors';
import './followupReminderCron.js'
import userRoute from './routes/userRoute.js'
import studentRoute from './routes/studentRoute.js'
import courseRoute from './routes/courseRoute.js'

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }));
app.set("view engine", "ejs")

mongoose.connect(process.env.MONGODB_URI).then(() => {
    app.listen(process.env.PORT, () => console.log('DB connected and listening to port', process.env.PORT))
}).catch(e => console.log('Error while connecting to DB', e.message))

app.use('/api/user', userRoute)
app.use('/api/course', courseRoute)
app.use('/api', studentRoute)