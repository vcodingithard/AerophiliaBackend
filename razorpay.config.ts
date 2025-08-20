import Razorpay from "razorpay";
import {config as dotEnvConfig} from "dotenv";

if(process.env.NODE_ENV !== "production"){
    dotEnvConfig();
}

const createRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID as string,
        key_secret : process.env.RAZORPAY_KEY_SECRET as string
    });
};

export const razorpayinstance = createRazorpayInstance();