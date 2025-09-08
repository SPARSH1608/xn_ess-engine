import { Kafka, type Consumer } from 'kafkajs';
import type { Offset, Trade } from '../../trade_engine/types.js';
import { v4 as uuid } from 'uuid';

const kafkaClient = new Kafka({
    clientId: 'trades_backend',
    brokers: ['localhost:9092']
});

const producer = kafkaClient.producer();
const admin = kafkaClient.admin();
let sharedConsumer: Consumer | null = null;
let isConsumerRunning = false;

// Store pending requests
const pendingRequests = new Map<string, { resolve: Function, topic: string, targetOffset: string }>();

export const initKafka = async () => {
    await producer.connect();
    await admin.connect();

    if (!sharedConsumer) {
        sharedConsumer = kafkaClient.consumer({ groupId: 'shared-api-consumer' });
        await sharedConsumer.connect();
        
        // Subscribe to both topics
        await sharedConsumer.subscribe({ topics: ['responses', 'prices'], fromBeginning: false });
        
        // Start the consumer once
        if (!isConsumerRunning) {
            sharedConsumer.run({
                eachMessage: async ({ topic, message }) => {
                    if (!message.value) return;
                    
                    const parsed = JSON.parse(message.value.toString('utf-8'));
                    
                    // Check if any pending request matches this message
                    for (const [requestId, { resolve, topic: reqTopic, targetOffset }] of pendingRequests) {
                        if (topic === reqTopic && parseInt(message.offset) >= parseInt(targetOffset)) {
                            resolve(parsed);
                            pendingRequests.delete(requestId);
                            break;
                        }
                    }
                }
            });
            isConsumerRunning = true;
        }
    }
};

export const findOffset = async (tradeTime: number, topic: string): Promise<Offset[]> => {
    const offsets = await admin.fetchTopicOffsetsByTimestamp(topic, tradeTime);
    const validOffsets: Offset[] = offsets.filter(o => o.offset !== '-1');

    if (validOffsets.length === 0) {
        throw new Error('No valid offsets found');
    }

    return validOffsets;
};

export const consumeMessageAtOffset = async (topic: string, partition: number, offset: string, timeoutMs = 5000): Promise<any> => {
    if (!sharedConsumer) throw new Error('Consumer not initialized');

    // Seek to the desired offset
    await sharedConsumer.seek({ topic, partition, offset });

    return new Promise((resolve) => {
        const requestId = uuid();
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            resolve({});
        }, timeoutMs);

        pendingRequests.set(requestId, {
            resolve: (data: any) => {
                clearTimeout(timeout);
                resolve(data);
            },
            topic,
            targetOffset: offset
        });
    });
};

export const sendTrade = async (tradeData: Trade) => {
    const tradeId = uuid();
    const tradeTime = Date.now();

    if (tradeData.trade_type === 'OPEN_LONG' || tradeData.trade_type === 'OPEN_SHORT') {
        tradeData.tradeId = tradeId;
    }

    await producer.send({
        topic: 'trades',
        messages: [{ value: JSON.stringify(tradeData) }]
    });
 
    const offsets = await findOffset(tradeTime, 'responses');
    if (!offsets || offsets.length === 0) {
        return new Error('No offsets found');
    }
      
    if (!offsets[0]) {
        return new Error('No offset found');
    }
    const finalPartition = offsets[0].partition;
    const finalOffset = offsets[0].offset;

    if (!finalOffset) return new Error('No offset found');

    return await consumeMessageAtOffset('responses', finalPartition, finalOffset,10000);
};

export const getLatestPriceFromKafka = async (time: number) => {
    const offsets = await findOffset(time, 'prices');
    if (!offsets || offsets.length === 0) {
        return new Error('No offsets found');
    }
    
    if (!offsets[0]) {
        return new Error('No offset found');
    }
    const finalPartition = offsets[0].partition;
    const finalOffset = offsets[0].offset;

    if (!finalOffset) return new Error('No offset found');

    return await consumeMessageAtOffset('prices', finalPartition, finalOffset, 5000);
};
export async function sendToKafka(topic: string, message: any) {
    try {
        await producer.connect();
        
        await producer.send({
            topic: topic,
            messages: [
                {
                    key: message.userId || Date.now().toString(),
                    value: JSON.stringify(message),
                    timestamp: Date.now().toString()
                }
            ]
        });
        
        await producer.disconnect();
        console.log(`Message sent to topic ${topic}:`, message);
    } catch (error) {
        console.error(`Error sending to Kafka topic ${topic}:`, error);
        throw error;
    }
}
export const cleanupKafka = async () => {
    if (sharedConsumer) {
        await sharedConsumer.disconnect();
        sharedConsumer = null;
        isConsumerRunning = false;
    }
    await admin.disconnect();
    await producer.disconnect();
};
