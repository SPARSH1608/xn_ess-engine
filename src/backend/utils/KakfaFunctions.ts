import { Kafka, type Consumer } from 'kafkajs'
import type { Offset, Trade } from '../../trade_engine/types.js'
import {v4 as uuid} from 'uuid'
const kafkaClient=new Kafka({
    clientId:'trades_backend',
    brokers:['localhost:9092']
    
})

const producer=kafkaClient.producer()
const consumer=kafkaClient.consumer({groupId:'api-response'})


await producer.connect()


const findOffset=async(tradeTime:number,topic:string)=>{
    const admin=kafkaClient.admin()
   await admin.connect()
    
    const offsets=await admin.fetchTopicOffsetsByTimestamp(topic,tradeTime)
    const validOffsets:Offset[]=offsets.filter(o=>o.offset!="-1");
    if(offsets.length==0){
        throw new Error("No offset found")
    }
    
   await admin.disconnect()
    return validOffsets
}
// offset [ { partition: 0, offset: '1446' } ]
export const consumeTrade=async(tradeId:string,tradeTime:number)=>{
    console.log('tradeId with time',tradeId)
   const tempConsumer = kafkaClient.consumer({ groupId: `api-resp-${uuid()}` });
    
    await tempConsumer.connect()
    await tempConsumer.subscribe({topic:'responses',fromBeginning:false})
  const offsetArr = await findOffset(tradeTime, 'responses');
const finalOffset = offsetArr[offsetArr.length - 1]?.offset;
const finalPartition = offsetArr[offsetArr.length - 1]?.partition;
    console.log('partitioned at',finalOffset,finalPartition)
 if (finalOffset == null || finalPartition == null) {
    return new Error('No partition or offset found');
}
  let latestTrades: any = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
            tempConsumer.stop();
            resolve({});
        }, 10000);

        tempConsumer.run({
            eachMessage: async ({ message, partition }) => {
                if (!message.value) return;
            const valueStr = message.value.toString('utf-8');
            const tradesObj = JSON.parse(valueStr);
            resolve(tradesObj);
          
            },
        }).then(async () => {
            await tempConsumer.seek({
                topic: 'responses',
                partition: finalPartition,
                offset: finalOffset,
            });
        });
    });

    console.log('trades',latestTrades)
    await tempConsumer.disconnect()
    return latestTrades
    
}

export const sendTrade=async(tradeData:Trade)=>{
    const tradeId=uuid()
    const tradeTime=Date.now()
    console.log('tradetime',tradeTime)
    if(tradeData.trade_type==='OPEN_LONG' || tradeData.trade_type==='OPEN_SHORT'){
        
        tradeData.tradeId=tradeId
    }
    
    await producer.send({
        topic:'trades',
        messages:[{
            value:JSON.stringify(tradeData)
        }]
    })
    return await consumeTrade(tradeId,tradeTime)
}



export const getLatestPriceFromKafka = async (time: number) => {
    const tempConsumer: Consumer = kafkaClient.consumer({ groupId: `temp-price-consumer-${Date.now()}` });
    await tempConsumer.connect();
    await tempConsumer.subscribe({ topic: 'prices', fromBeginning: false });

    const offsets = await findOffset(time, 'prices'); 
    const finalPartition = 0; 
    const finalOffset = offsets[offsets.length - 1]?.offset;
console.log('final offset',finalOffset)
    if (!finalOffset) {
        await tempConsumer.disconnect();
        return new Error('No offset found');
    }

    let latestPrices: any = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
            tempConsumer.stop();
            resolve({});
        }, 5000);

        tempConsumer.run({
            eachMessage: async ({ message, partition }) => {
                if (!message.value) return;
            const valueStr = message.value.toString('utf-8');
            const pricesObj = JSON.parse(valueStr);
            resolve(pricesObj);
          
            },
        }).then(async () => {
            await tempConsumer.seek({
                topic: 'prices',
                partition: finalPartition,
                offset: finalOffset,
            });
        });
    });

    await tempConsumer.disconnect();

    return latestPrices;
};
