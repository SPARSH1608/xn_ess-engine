import express from 'express'
import cors from 'cors'
const app=express()
import dotenv from 'dotenv'
dotenv.config()
const PORT=process.env.PORT || 3000
app.use(cors())
app.use(express.json())
import {router as TradeRoutes} from './routes/Trades.js'

app.use('/api/v1/trade',TradeRoutes)
app.listen(PORT,()=>{
    console.log(`listening on port ${PORT}`)
})