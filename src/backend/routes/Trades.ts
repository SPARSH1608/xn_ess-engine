
import express from 'express'
import { closeLong, closeShort, createLong, createShort } from '../controllers/TradesController.js'
export const router=express.Router()

router.post('/createLong',createLong)
router.post('/closeLong',closeLong)
router.post('/createShort',createShort)
router.post('/closeShort',closeShort)