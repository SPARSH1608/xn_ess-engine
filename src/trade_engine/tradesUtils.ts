import { users } from "./Data.js"
import { successKafka,failureKafka } from "./Responses.js"
import { v4 as uuid } from "uuid";
import type { KafkaResponse,closeType,Trade } from "./types.js";
import { StatusCodes } from "http-status-codes";

function insertDecimal(x: number, y: number): number {
  return x / Math.pow(10, y);
}


export const handleOpenLong = (trade: Trade) => {

  if (!trade.boughtPrice || !trade.quantity || !trade.asset || !trade.userId) {
   return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);
  }

  const finalLeverage = Number(trade.leverage) || 1;
  const finalMargin = insertDecimal(trade.quantity * trade.boughtPrice, trade.decimal);

  const user = users[trade.userId];
  if (!user) {
   return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);

  }

  const requiredMargin = insertDecimal(
    trade.quantity * trade.boughtPrice * finalLeverage,
    trade.decimal
  );

  if (user.balance < requiredMargin) {
     return failureKafka({error:"Insufficient balance" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
  }

  user.balance -= finalMargin;
  const data = {
    ...trade,
    margin: finalMargin,
    leverage: finalLeverage,
    status: "OPEN",

    createdAt: new Date(),
  };
user.trades.push(data)
return successKafka({success:true,data,error:""});
};


export const handleCloseLong=(incomingData:closeType):KafkaResponse=>{
   if(Object.keys(users).length==0 ){
     return failureKafka({error:"No Trade found for this tradeId" ,StatusCode:StatusCodes.NOT_FOUND},incomingData.tradeId);
   }
    if(!incomingData.tradeId && !incomingData.userId){
     return failureKafka({error:"No Trade found for this tradeId" ,StatusCode:StatusCodes.NOT_FOUND},incomingData.tradeId);

    }
    if(!incomingData.closedPrice){
          return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},incomingData.tradeId);

    }
    const user=users[incomingData.userId]
    let userTrade=user?.trades.find((t)=>t.tradeId===incomingData.tradeId)
    if(!user){
   return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},incomingData.tradeId);
        
    }
    if(!userTrade){
         return failureKafka({error:"No Trade found for this tradeId" ,StatusCode:StatusCodes.NOT_FOUND},incomingData.tradeId);
    }
    const pnl=insertDecimal(incomingData?.closedPrice-userTrade.boughtPrice,4)
    user.balance=user.balance+pnl
  const data={
    ...userTrade,
    status:'CLOSED',
    closedPrice:incomingData.closedPrice,
    closedAt:new Date(),
    pnl
  }
  
  const newTrades=user.trades.filter(t=>t.tradeId!=incomingData.tradeId);
  newTrades.push(data)
  users[incomingData.userId] = {...user, trades: newTrades}
  return successKafka({success:true,data,error:""});
}

export const handleOpenShort=(trade:Trade)=>{
  
   if (!trade.boughtPrice || !trade.quantity || !trade.asset || !trade.userId) {
   return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);


  }
  const finalLeverage=trade.leverage | 1 ;
  if(finalLeverage<1){
   return failureKafka({error:"Invalid Leverage" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);
    
  }
  const finalMargin=insertDecimal(((trade.quantity*trade.boughtPrice)/finalLeverage),trade.decimal)
  const user=users[trade.userId]
  if(!user){
    return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
   
  }
  if(user.balance<insertDecimal((finalMargin*finalLeverage),trade.decimal)){
     return failureKafka({error:"Insufficient balance" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
   
    }
    user.balance-=finalMargin
      const res = {
    ...trade,
    tradeId:uuid(),
    margin: finalMargin,
    leverage: finalLeverage,
    status: "OPEN",
    type: "SHORT",
    createdAt: new Date(),
  };
  user.trades.push(res)
return successKafka({success:true,data:res,error:""});
}

export const handleCloseShort=(trade:closeType):KafkaResponse=>{
     if(!trade.tradeId || !trade.closedPrice){
         return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);

    }
    const user=users[trade.userId]
    let userTrade=user?.trades.find((t)=>t.tradeId===trade.tradeId)
    if(!user){
       return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
    
    }
    if(!userTrade){
         return failureKafka({error:"No Trade found for this tradeId" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);

       
    }
    const pnl=insertDecimal(userTrade.boughtPrice-trade?.closedPrice,4)
  if(user){
    user.balance=user.balance+pnl
  }
  const data={
    ...userTrade,
    status:'CLOSED',
    closedAt:new Date(),
    pnl
  }
    const newTrades=user.trades.filter(t=>t.tradeId!=trade.tradeId);
  newTrades.push(data)
  users[trade.userId] = {...user, trades: newTrades}

return successKafka({success:true,data,error:""});
  
}

