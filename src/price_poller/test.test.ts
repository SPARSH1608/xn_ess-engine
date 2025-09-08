import { Kafka } from 'kafkajs';
import waitForExpect from 'wait-for-expect';
import { startPoll } from "./index.js";


import WebSocket ,{ WebSocketServer} from "ws";

const ASSETS=['BTC_USDC_PERP','SOL_USDC_PERP','ETH_USDC_PERP']

 const startMockServer=(interval)=>{
    const wss=new WebSocketServer({port:8080})
    wss.on('connection',(ws)=>{
        const mockData={
            A:'A',
            B: 'B',
            E: 800,
            T: Date.now(),
            a: 5000+Math.random(),
            b: 4900-Math.random(),
            e: 'E',
            s: ASSETS[Math.ceil(Math.random()*ASSETS.length)-1],
            u: 769769,
        }
        const mockInterval=setInterval(()=>ws.send(JSON.stringify({data:mockData})),interval)
        ws.on('close',()=>{
            clearInterval(mockInterval)
            console.log('connection closed')
        })
    })
    wss.on('close',()=>{
        console.log('Server closed')
    })
    wss.on('error',(err)=>{
        console.log('error in mock server')
    })
 return wss   
}


describe('Price poller E2E testing', () => {
    let mockServer;
    let stopPolling;

    beforeAll(async () => {
        mockServer = startMockServer(1000);
        stopPolling = await startPoll();
    });

    afterAll(async () => {
        if (mockServer) mockServer.close();
    });

    it('should poll prices and send to kafka', async () => {
        const kafka = new Kafka({
            clientId: 'test-client',
            brokers: ['localhost:9092']
        });

        const consumer = kafka.consumer({ groupId: 'test-group' });
        await consumer.connect();
        await consumer.subscribe({ topic: 'prices', fromBeginning: false });

        const messages=[]

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                messages.push({
                    key: message.key ? message.key.toString() : null,
                    value: message.value ? message.value.toString() : null,
                });
            },
        });

        await waitForExpect(() => {
            expect(messages.length).toBeGreaterThan(0);
        }, 10000, 1000);

        await consumer.disconnect();
    }, 15000);
});
