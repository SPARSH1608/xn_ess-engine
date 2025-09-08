import { Kafka, type Consumer } from "kafkajs";
import { v4 as uuid } from "uuid";
import { loadSnapShot, saveSnapShot } from "./Snapshot.js";
import { failureKafka } from "./Responses.js";
import { StatusCodes } from "http-status-codes";
import { handleOpenLong, handleCloseLong, handleOpenShort, handleCloseShort } from './tradesUtils.js'
import mongoose from "mongoose";
import type { closeType, KafkaResponse, Trade } from "./types.js";
import { getSnapshot, ensureDummyData, users } from "./Data.js"; 
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI
console.log('uri', MONGO_URI)
const kafkaClient = new Kafka({
    clientId: 'trade_engine',
    brokers: ['localhost:9092']
})
const consumer: Consumer = kafkaClient.consumer({
    groupId: 'engine',
})

const userConsumer: Consumer = kafkaClient.consumer({
    groupId: 'user-engine',
})

const admin = kafkaClient.admin();
await admin.connect();

export const sendResponse = async (res: KafkaResponse) => {
    const tradeTime = Date.now()
    console.log('response time', tradeTime)
    await producer.send({
        topic: 'responses',
        messages: [{
            value: JSON.stringify(res)
        }]
    })
}

export function processTrade(trade: Trade | closeType): KafkaResponse {
    switch (trade.trade_type) {
        case 'OPEN_LONG': return handleOpenLong(trade as Trade);
        case 'CLOSE_LONG': return handleCloseLong(trade as closeType);
        case 'OPEN_SHORT': return handleOpenShort(trade as Trade);
        case 'CLOSE_SHORT': return handleCloseShort(trade as closeType);
        default: return failureKafka({ error: "No Valid tradeType", StatusCode: StatusCodes.NOT_FOUND }, trade.tradeId);
    }
}

function processUserEvent(userEvent: any) {
    console.log('Processing user event:', userEvent);
    
    if (userEvent.userId && !users[userEvent.userId]) {
        users[userEvent.userId] = {
            userId: userEvent.userId,
         
            balance: 5000,
            trades: [],
        };
        console.log(`User ${userEvent.userId} added to memory`);
        
        setTimeout(() => {
            saveSnapShot();
        }, 1000);
    }
}

const producer = kafkaClient.producer()
let isMongoConnected = false;

const startEngine = async () => {
    let engineRestartTime = Date.now()
    console.log('engine started at', engineRestartTime)
    if (!MONGO_URI) {
        throw new Error("MONGO_URI is not defined in environment variables");
    }

    await mongoose.connect(MONGO_URI);
    isMongoConnected = true;
    await loadSnapShot();
    ensureDummyData(); 
    
    await consumer.connect();
    await consumer.subscribe({ topic: 'trades', fromBeginning: false });

    await userConsumer.connect();
    await userConsumer.subscribe({ topic: 'user', fromBeginning: false });

    consumer.on(consumer.events.GROUP_JOIN, async () => {
        console.log('Consumer group joined, seeking offsets...');
        const offsets = await admin.fetchTopicOffsetsByTimestamp('trades', engineRestartTime);
        console.log('offset', offsets)

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
            console.log('tradesData', tradeData)
            const response = await processTrade(tradeData);
            sendResponse(response)
        }
    });

    await userConsumer.run({
        autoCommit: true,
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const userEvent = JSON.parse(message.value?.toString() || '{}');
                console.log('Received user event:', userEvent);
                processUserEvent(userEvent);
            } catch (error) {
                console.error('Error processing user event:', error);
            }
        }
    });

    console.log('Trade engine and user consumer started successfully');
}

setInterval(async () => {
    try {
        const currentHealth = { id: uuid(), ts: new Date() }
        await producer.connect()
        console.log('sending health')
        await producer.send({
            topic: 'health',
            messages: [
                { value: JSON.stringify(currentHealth) }
            ]
        })
    } catch (error) {
        console.log('health error', error)
    }
}, 5000)

setInterval(() => {
    try {
        if (!isMongoConnected) return;
        const snapshot = getSnapshot()
        console.log('snapshot', snapshot, Array.isArray(snapshot))
        saveSnapShot()
    } catch (error) {
        console.log('cant take snapshot fix it ')
    }
}, 15000)

startEngine()

