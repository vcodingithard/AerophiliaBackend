import {Request , Response , NextFunction} from "express"
import ExpressError from "./expressError";


const errorHandler = (err : ExpressError ,req : Request ,res : Response ,next : NextFunction) =>{
    if(err){
        const statusNumber =  err.status || 500;
        const message = err.message || "Internal Server Error";
        console.log(err);
        console.log(`${statusNumber} , ${message}`);

        res.status(statusNumber).json({
            success : false,
            status : statusNumber,
            message : message
        });
    }else{
        next();
    }
};

export default errorHandler