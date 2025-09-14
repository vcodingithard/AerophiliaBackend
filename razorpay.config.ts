import Razorpay from "razorpay";
import {config as dotEnvConfig} from "dotenv";

if(process.env.NODE_ENV !== "production"){
    dotEnvConfig();
}

const createRazorpayInstance = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // Validate required environment variables
    if (!keyId || !keySecret) {
        console.error('❌ Razorpay configuration error:');
        console.error('Missing required environment variables:');
        if (!keyId) console.error('- RAZORPAY_KEY_ID is not set');
        if (!keySecret) console.error('- RAZORPAY_KEY_SECRET is not set');
        console.error('\nPlease check your .env file and ensure Razorpay credentials are properly configured.');
        console.error('Get your credentials from: https://dashboard.razorpay.com/');
        throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.');
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret
    });
};

export const razorpayinstance = createRazorpayInstance();