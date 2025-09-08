import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  trades: { type: Array, required: true },

});

export const User = mongoose.model('User', userSchema);