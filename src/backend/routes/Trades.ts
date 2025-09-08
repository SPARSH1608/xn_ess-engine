
import express from 'express'
import { closeLong, closeShort, createLong, createShort } from '../controllers/TradesController.js'
import { authenticateToken } from '../middlewares/AuthMiddleware.js'
export const router=express.Router()

router.post('/createLong',authenticateToken,createLong)
router.post('/closeLong',authenticateToken,closeLong)
router.post('/createShort',authenticateToken,createShort)
router.post('/closeShort',authenticateToken,closeShort)