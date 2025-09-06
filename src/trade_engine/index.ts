import { Kafka, type Consumer } from "kafkajs";
import { v4 as uuid } from "uuid";
import { loadSnapShot, saveSnapShot } from "./Snapshot.js";
import { failureKafka } from "./Responses.js";
import { StatusCodes } from "http-status-codes";
import {handleOpenLong,handleCloseLong,handleOpenShort,handleCloseShort} from './tradesUtils.js'
import mongoose from "mongoose";
import type { closeType, KafkaResponse, Trade } from "./types.js";
import { getSnapshot } from "./Data.js";
import dotenv from "dotenv";
dotenv.config();


const MONGO_URI=process.env.MONGO_URI
console.log('uri',MONGO_URI)
const kafkaClient=new Kafka({
    clientId:'trade_engine',
    brokers:['localhost:9092']
})
const consumer:Consumer=kafkaClient.consumer({
    groupId:'engine',

})
const admin = kafkaClient.admin();
await admin.connect();


function processTrade(trade:Trade | closeType):KafkaResponse{
    switch(trade.trade_type){
        case 'OPEN_LONG' : return handleOpenLong(trade as Trade) ;
        case 'CLOSE_LONG' : return handleCloseLong(trade as closeType) ;
        case 'OPEN_SHORT' : return handleOpenShort(trade as Trade);
        case 'CLOSE_SHORT':return handleCloseShort(trade as closeType);
        default:   return failureKafka({error:"No Valid tradeType" ,StatusCode:StatusCodes.NOT_FOUND},trade.tradeId);
    }
}
const producer=kafkaClient.producer()
let isMongoConnected = false;

console.log("MongoDB connected");

const startEngine=async()=>{
    let engineRestartTime=Date.now()
    if (!MONGO_URI) {
        throw new Error("MONGO_URI is not defined in environment variables");
    }
    
    await mongoose.connect(MONGO_URI);  
    isMongoConnected = true;
    await loadSnapShot()
    await consumer.connect();
    await consumer.subscribe({ topic: 'trades', fromBeginning: false });

    consumer.on(consumer.events.GROUP_JOIN, async () => {
        console.log('Consumer group joined, seeking offsets...');
        const offsets = await admin.fetchTopicOffsetsByTimestamp('trades', engineRestartTime);

        for (const { partition, offset } of offsets) {
            if (offset !== '-1') {
                consumer.seek({ topic: 'trades', partition, offset });
                console.log(`Seeking partition ${partition} to offset ${offset}`);
            }
        }
    });

    await consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic, partition, message }) => {
            const tradeData: Trade | closeType = JSON.parse(message.value?.toString() || '{}');
            await processTrade(tradeData);
        }
    });
    
}
setInterval(async()=>{
    try {
        const currentHealth={id:uuid(),ts:new Date()}
        await producer.connect()
        console.log('sending health')
        await producer.send({
            topic:'health',
            messages:[
                {value:JSON.stringify(currentHealth)}
            ]
        })
    } catch (error) {
        console.log('health error',error)
    }
},5000)

setInterval(()=>{
    try {
         if (!isMongoConnected) return;
       const snapshot=getSnapshot()
       console.log('snapshot',snapshot,Array.isArray(snapshot)) 
       saveSnapShot()
    } catch (error) {
        console.log('cant take snapshot fix it ')
    }
},15000)


startEngine()

