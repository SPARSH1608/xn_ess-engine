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
    askPrice:number;
    bidPrice:number;
    asset:string;
    decimal:number
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
const prices=new Map<string,processData>()

const processDataFunc=(d:backpackData):processData=>{
    const value={
         askPrice:Number(Number(d.a).toFixed(4)) ,
         bidPrice:Number(Number(d.b).toFixed(4)),
         asset:d.s,
         decimal:4
    }
    prices.set(d.s,value)
    return value
}

let producer: any = null;
let publishInterval: NodeJS.Timeout | null = null;

const initializeProducer = async () => {
    producer = kafkaClient.producer();
    await producer.connect();
    console.log('Kafka producer connected');
};

const PublishDataKafka = async () => {
    if (!producer) {
        console.log('Producer not initialized');
        return;
    }
    
    if (prices.size === 0) {
        console.log('No price data to publish yet');
        return;
    }
    
    const pricesObj = Object.fromEntries(prices);
    
    try {
        await producer.send({
            topic: 'prices',
            messages: [
                { value: JSON.stringify(pricesObj) }
            ]
        });
        console.log('Published prices to Kafka at:', new Date().toISOString());
        console.log('Data:', pricesObj);
    } catch (error) {
        console.error('Error publishing to Kafka:', error);
    }
};

const startPublishing = () => {
    if (publishInterval) {
        clearInterval(publishInterval);
    }
    PublishDataKafka();
    publishInterval = setInterval(PublishDataKafka, 5000);
    console.log('Started publishing every 5 seconds');
};
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const startPoll=()=>{
    const streamUrl=`wss://ws.backpack.exchange`
    const ws=new WebSocket(streamUrl)
    
    ws.on('open',()=>{
        console.log('Connected to Backpack WebSocket');
        ws.send(JSON.stringify(webSocketOptions))
    })
  
    ws.on('message',(data)=>{
        const parsedData=JSON.parse(data.toString()).data
        console.log('data coming from websocket',parsedData)
        if(!parsedData || !parsedData.s || !parsedData.a || !parsedData.b) return
        
        const processedData = processDataFunc(parsedData)
        console.log('processed price data:', processedData)
        
        if (prices.size > 0 && !publishInterval) {
            startPublishing();
        }
    })
    
    ws.on('close',()=>{
        console.log('Connection Closed')
        if (publishInterval) {
            clearInterval(publishInterval);
            publishInterval = null;
        }
    })
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error)
    })
}

const main = async () => {
    try {
        await initializeProducer();
        startPoll();
    } catch (error) {
        console.error('Error starting application:', error);
    }
};

main();