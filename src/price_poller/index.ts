import WebSocket from 'ws'
import { Kafka } from 'kafkajs'
type backpackData={
     A:string;
    B: string;
    E: number;
    T: number;
    a: string;
    b: string;
    e: string;
    s: string;
    u: number;
    
}
type processData={
    askPrice:number;bidPrice:number;asset:string;decimal:number
}
const kafkaClient=new Kafka({
    clientId:'backpack_trades',
    brokers:['localhost:9092']
})

const ASSETS=['BTC_USDC','SOL_USDC','ETH_USDC']
const webSocketOptions={
    method:'SUBSCRIBE',
    params:[
        'bookTicker.BTC_USDC_PERP','bookTicker.ETH_USDC_PERP','bookTicker.SOL_USDC_PERP'
    ],
    id:1
}
const prices=new Map<string,processData>

const processData=(d:backpackData):void=>{

        const value={
             askPrice:Number(Number(d.a).toFixed(4)) ,
             bidPrice:Number(Number(d.b).toFixed(4)),
             asset:d.s,
             decimal:4
            
        }
        prices.set(d.s,value)
    
    
    
}
const producer=kafkaClient.producer()
const PublishDataKafka = async () => {
    await producer.connect();
    
    const pricesObj = Object.fromEntries(prices);  

    await producer.send({
        topic: 'prices',
        messages: [
            { value: JSON.stringify(pricesObj) }
        ]
    });
};

const startPoll=()=>{
    
        const streamUrl=`wss://ws.backpack.exchange`
        const ws=new WebSocket(streamUrl)
        ws.on('open',()=>{
            // console.log(`Connected to asset`)
               ws.send(JSON.stringify(webSocketOptions))
            // console.log('subscriber')
            
        })
      
        ws.on('message',(data)=>{
            const parsedData=JSON.parse(data.toString()).data
            // console.log('data coming from websocket',parsedData)
           const processedData= processData(parsedData)
        //    console.log('prices',prices)
      
        })
        ws.on('close',()=>{
            console.log('Connection Closed')
        })
    
}

setInterval(PublishDataKafka,1000)
startPoll()