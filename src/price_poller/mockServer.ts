
import WebSocket ,{ WebSocketServer} from "ws";

const ASSETS=['BTC_USDC_PERP','SOL_USDC_PERP','ETH_USDC_PERP']

export const startMockServer=(interval:number)=>{
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

