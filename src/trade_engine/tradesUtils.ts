import { users } from "./Data.js"
import { successKafka,failureKafka } from "./Responses.js"
import { v4 as uuid } from "uuid";
import type { KafkaResponse,closeType,Trade } from "./types.js";
import { StatusCodes } from "http-status-codes";

export function insertDecimal(x: number, y: number): number {
  return x / Math.pow(10, y);
}


export const handleOpenLong = (trade: Trade) => {
  trade.decimal=4
console.log('trade in enginjer',trade)
  if (!trade.boughtPrice || !trade.quantity || !trade.asset || !trade.userId) {
   return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);
  }

  const finalLeverage = Number(trade.leverage) || 1;

  const user = users[trade.userId];
  console.log('all users',users)
  console.log('user found',user)
  if (!user) {
   return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);

  }

  const requiredMargin = insertDecimal(
   ( (trade.quantity * trade.boughtPrice) / finalLeverage),
    trade.decimal
  );
console.log('required margin',requiredMargin)
  if (user.balance < requiredMargin) {
     return failureKafka({error:"Insufficient balance" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
  }

  user.balance -= requiredMargin;
  console.log('balance after trade',user.balance)
  const data = {
    ...trade,
    margin: requiredMargin,
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
    const pnl=insertDecimal((insertDecimal(incomingData?.closedPrice-userTrade.boughtPrice,4))*userTrade.quantity,4)
    user.balance=user.balance+pnl
  const data={
    ...userTrade,
    status:'CLOSED',
    closedPrice:incomingData.closedPrice,
    closedAt:new Date(),
    pnl
  }
  
  const newTrades=user.trades.filter(t=>t.tradeId!=incomingData.tradeId);
  users[incomingData.userId] = {...user, trades: newTrades}
  return successKafka({success:true,data,error:""});
}

export const handleOpenShort=(trade:Trade)=>{
  trade.decimal = 4; 
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
  console.log('trade in close short',trade)
     if(!trade.tradeId || !trade.closedPrice){
         return failureKafka({error:"Check Parameters provided" ,StatusCode:StatusCodes.BAD_REQUEST},trade.tradeId);

    }
    const user=users[trade.userId]
    console.log('user in close short',user)
    
    let userTrade=user?.trades.find((t)=>t.tradeId===trade.tradeId)
    console.log('trade to be closed',userTrade)
    
    if(!user){
       return failureKafka({error:"No user Found" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
    
    }
    if(!userTrade){
         return failureKafka({error:"No Trade found for this tradeId" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);

       
    }
    const pnl=insertDecimal((userTrade.boughtPrice-trade?.closedPrice)*userTrade.quantity,4)
  if(user){
    user.balance=user.balance+pnl
  }
  const data={
    ...userTrade,
    closedPrice:trade.closedPrice,
    status:'CLOSED',
    closedAt:new Date(),
    pnl
  }
    const newTrades=user.trades.filter(t=>t.tradeId!=trade.tradeId);

  users[trade.userId] = {...user, trades: newTrades}
return successKafka({success:true,data,error:""});
  
}

