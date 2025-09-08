import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {router as TradeRoutes} from './routes/Trades.js'
import authRoutes from './routes/User.js'
import { initKafka } from './utils/KakfaFunctions.js'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
const app=express()
const PORT=process.env.PORT || 3000
dotenv.config()
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use('/api/v1/auth',authRoutes)
app.use('/api/v1/trade',TradeRoutes)
app.listen(PORT, async () => {
    await initKafka();
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI environment variable is not defined');
    }
    await mongoose.connect(mongoUri);
    console.log(`listening on port ${PORT}`);
});