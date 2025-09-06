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


const findOffset=async(tradeTime:number,topic:string):Promise<Offset[]>=>{
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
   const tempConsumer = kafkaClient.consumer({ groupId: `api-resp-${uuid()}` });
    
    await tempConsumer.connect()
    await tempConsumer.subscribe({topic:'responses',fromBeginning:false})
    let offset=await findOffset(tradeTime,'responses')
    
    const finalOffset=offset[offset.length-1]?.offset
    const finalPartition=offset[offset.length-1]?.partition
    console.log('partitioned at',finalOffset,finalPartition)
 if (finalOffset == null || finalPartition == null) {
    return new Error('No partition or offset found');
}

tempConsumer.run({
    eachMessage:async({message})=>{
        const data=JSON.parse(message.value?.toString() || "{}")
        messages.push(data)
    }
})
    await tempConsumer.seek({
        topic:'responses',
        partition:finalPartition,
         offset:finalOffset
    })
    const messages:any[]=[]
    await new Promise<void>((resolve)=>{
       setTimeout(
        async()=>{
            await tempConsumer.stop()
            resolve()
        },5000)
        
    })
    console.log('messages',messages)
    const matchedResponse=messages.find(msg=>msg.tradeId===tradeId)
    
    await tempConsumer.disconnect()
    return matchedResponse
    
}

export const sendTrade=async(tradeData:Trade)=>{
    const tradeId=uuid()
    const tradeTime=Date.now()
    console.log('tradetime',tradeTime)
    tradeData.tradeId=tradeId
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

    const latestPrices: any = await new Promise((resolve) => {
        const timeout = setTimeout(async () => {
            await tempConsumer.stop();
            resolve({});
        }, 5000);

        tempConsumer.run({
            eachMessage: async ({ message, partition }) => {
                if (!message.value) return;
                const pricesObj = JSON.parse(message.value.toString());
                console.log('Prices received from Kafka:', pricesObj);
                clearTimeout(timeout);
                resolve(pricesObj);
                await tempConsumer.stop();
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
