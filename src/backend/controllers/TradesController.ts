import type { RequestHandler } from "express"
import { getLatestPriceFromKafka, sendTrade } from "../utils/KakfaFunctions.js"

export const createLong:RequestHandler=async(req,res)=>{
    try {
        
        console.log('request body',req.body)
        const data=req.body
       const prices=await getLatestPriceFromKafka(Date.now())
       console.log('current prices',prices)
         if (prices instanceof Error) {
            return res.status(500).json({ error: prices.message });
        }
        // const response=sendTrade(data)
        // console.log('response',response)
        return res.status(200).json('ok')
    } catch (err) {
           console.error('Error in createLong:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
export const closeLong:RequestHandler=(req,res)=>{
    
}

export const createShort:RequestHandler=(req,res)=>{
    
}


export const closeShort:RequestHandler=(req,res)=>{
    
}