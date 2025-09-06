import { StatusCodes } from "http-status-codes";
export function AppError(
    name:string,
    message:string,
    statusCode:number
){
    return {name,message,statusCode}
}
export function ServiceError(
      message = "Something went wrong",
  statusCode = StatusCodes.INTERNAL_SERVER_ERROR
){
      return AppError("ServiceError", message, statusCode);
}
export function ValidationError(errors: { message: string }[]) {
  return AppError(
    "ValidationError",
    "Not Able to validate the data sent in the request",
    StatusCodes.BAD_REQUEST
  );
}