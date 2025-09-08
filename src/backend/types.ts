
export type Trade = {
  tradeId: string
 trade_type: "OPEN_LONG" | "OPEN_SHORT" | "CLOSE_SHORT" | "CLOSE_LONG";
  userId: string
  asset: string
  quantity: number
  margin: number
  leverage: number
  boughtPrice: number
 
  status: string
  stopLoss?: number
  takeProfit?: number
  closedPrice?: number
  closedAt?: Date
  liquidatedPrice: number
  decimal: number
  isLiquidated: boolean
  createdAt?: Date
  liquidatedAt?: Date
  pnl: number
}

export type User={
    userId:string;
    balance:number;
    trades:Trade[]   
} 