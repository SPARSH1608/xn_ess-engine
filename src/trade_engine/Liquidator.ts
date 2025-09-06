import { getLatestPriceFromKafka } from "../backend/utils/KakfaFunctions.js";
import { users } from "./Data.js";
import { handleCloseLong, handleCloseShort, insertDecimal } from "./tradesUtils.js";

const prices=await getLatestPriceFromKafka(Date.now())
if(prices instanceof Error){
    throw new Error("Could not get prices from Kafka")
}

async function liquidatePositions(){
    console.log('liquidating positions at prices',prices)
    for(const userId of Object.keys(users)){
        const user=users[userId]
        if(!user){
            console.log('no user found for userId',userId)
            continue
        }
        
        for(const trade of user.trades){
            let pnl=0
            let shouldLiquidate=false
            if(trade.trade_type==='OPEN_LONG'){
              pnl=insertDecimal((insertDecimal(prices[trade.asset].bidPrice,4)-trade.boughtPrice)*trade.quantity,4)
              
            }else{
                pnl=insertDecimal((insertDecimal(trade.boughtPrice-prices[trade.asset].askPrice,4))*trade.quantity,4)
            }
            if(trade.stopLoss){
                if((trade.trade_type==='OPEN_LONG' && prices[trade.asset].bidPrice<=trade.stopLoss) || 
                (trade.trade_type==='OPEN_SHORT' && prices[trade.asset].askPrice>=trade.stopLoss)){
                    shouldLiquidate=true
                }
            }
            if(trade.takeProfit){
                if((trade.trade_type==='OPEN_LONG' && prices[trade.asset].bidPrice>=trade.takeProfit) || 
                (trade.trade_type==='OPEN_SHORT' && prices[trade.asset].askPrice<=trade.takeProfit)){
                    shouldLiquidate=true
                }
            }
            if(shouldLiquidate){
                console.log('liquidating trade',trade)
                if(trade.trade_type==='OPEN_LONG'){
                    trade.liquidatedAt=new Date()
                    trade.liquidatedPrice=prices[trade.asset].bidPrice
                    trade.isLiquidated=true
                    trade.pnl=pnl
                    handleCloseLong(trade)
                }
                else if(trade.trade_type==='OPEN_SHORT'){
                    trade.liquidatedAt=new Date()
                    trade.liquidatedPrice=prices[trade.asset].bidPrice
                    trade.isLiquidated=true
                    trade.pnl=pnl
                    handleCloseShort(trade)
                }
            }
        }
    }
}
setInterval(liquidatePositions,60000)