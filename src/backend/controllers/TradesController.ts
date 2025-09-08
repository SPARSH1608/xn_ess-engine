import type { RequestHandler } from "express"
import { cleanupKafka, getLatestPriceFromKafka, initKafka, sendTrade } from "../utils/KakfaFunctions.js"
import { Trade } from "../Models/Trades.js"
export const createLong:RequestHandler=async(req,res)=>{
    try {
        const startTime=Date.now()
        const data=req.body
        console.log('request body',req.body)
        const prices=await getLatestPriceFromKafka(Date.now())
        console.log('prices',prices[data.asset].askPrice)
        data.boughtPrice=prices[data.asset].askPrice
        data.trade_type='OPEN_LONG'
       console.log('current prices',prices)
         if (prices instanceof Error) {
            return res.status(500).json({ error: prices.message });
        }
        const response:any=await sendTrade(data)
        console.log('response',response,typeof(response))
        if(typeof(response)==='object' && Object.keys(response).length===0){
            return res.status(500).json({ error: 'Engine is down' });
        }
      
        console.log('time taken to process trade',Date.now()-startTime)

      return res.status(response.StatusCode).json(response)
    } catch (err) {
           console.error('Error in createLong:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
export const closeLong:RequestHandler=async(req,res)=>{
       try {
        
        const data=req.body
        console.log('request body',req.body)
        const prices=await getLatestPriceFromKafka(Date.now())
        console.log('prices',prices[data.asset].askPrice)
        data.closedPrice=prices[data.asset].bidPrice
        data.trade_type='CLOSE_LONG'
       console.log('current prices',prices)
         if (prices instanceof Error) {
            return res.status(500).json({ error: prices.message });
        }
        const response:any=await sendTrade(data)
        console.log('response',response,typeof(response))
        if(typeof(response)==='object' && Object.keys(response).length===0){
            return res.status(500).json({ error: 'Engine is down' });
        }
        if(response.success){
        await Trade.create(response.data)
        }
      return res.status(response.StatusCode).json(response)
    } catch (err) {
           console.error('Error in createLong:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export const createShort:RequestHandler=async (req,res)=>{
   try {
        
        const data=req.body
        console.log('request body',req.body)
        const prices=await getLatestPriceFromKafka(Date.now())
        console.log('prices',prices[data.asset].askPrice)
        data.boughtPrice=prices[data.asset].askPrice
        data.trade_type='OPEN_SHORT'
       console.log('current prices',prices)
         if (prices instanceof Error) {
            return res.status(500).json({ error: prices.message });
        }
        const response:any=await sendTrade(data)
        console.log('response',response,typeof(response))
        if(typeof(response)==='object' && Object.keys(response).length===0){
            return res.status(500).json({ error: 'Engine is down' });
        }
      return res.status(response.StatusCode).json(response)
    } catch (err) {
           console.error('Error in createLong:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}


export const closeShort:RequestHandler=async(req,res)=>{
       try {
        
        const data=req.body
        console.log('request body',req.body)
        const prices=await getLatestPriceFromKafka(Date.now())
        console.log('prices',prices[data.asset].askPrice)
        data.closedPrice=prices[data.asset].bidPrice
        data.trade_type='CLOSE_SHORT'
       console.log('current prices',prices)
         if (prices instanceof Error) {
            return res.status(500).json({ error: prices.message });
        }
        const response:any=await sendTrade(data)
        console.log('response',response,typeof(response))
        if(typeof(response)==='object' && Object.keys(response).length===0){
            return res.status(500).json({ error: 'Engine is down' });
        }
         if(response.success){
        await Trade.create(response.data)
        }
      return res.status(response.StatusCode).json(response)
    } catch (err) {
           console.error('Error in createLong:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}