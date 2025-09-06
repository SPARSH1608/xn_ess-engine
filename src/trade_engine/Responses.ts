import type { KafkaResponse } from "./types.js";

export function successKafka(data:any):KafkaResponse{
      return { success: true, data ,StatusCode:200,tradeId:data.tradeId };
}

export function failureKafka(err:{error:string,StatusCode:number},tradeId:string): KafkaResponse {
  return {
    success: false,
    data:[],
    error:err.error,
    StatusCode :err.StatusCode || 500,
    tradeId
    
  };
}