import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  tradeId: { type: String, required: true, unique: true },
  trade_type: { 
    type: String, 
    enum: ['OPEN_LONG', 'OPEN_SHORT', 'CLOSE_SHORT', 'CLOSE_LONG'], 
    required: true 
  },
  userId: { type: String, required: true },
  asset: { type: String, required: true },
  quantity: { type: Number, required: true },
  boughtPrice: { type: Number, required: true },
  closedPrice: { type: Number },
  leverage: { type: Number, required: true },
  margin: { type: Number, required: true },
  status: { type: String, enum: ['OPEN', 'CLOSED'], required: true },
  stopLoss: { type: Number },
  takeProfit: { type: Number },
  liquidatedPrice: { type: Number },
  decimal: { type: Number, required: true },
  isLiquidated: { type: Boolean, default: false },
  pnl: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
  liquidatedAt: { type: Date }
});

export const Trade = mongoose.model('Trade', tradeSchema);