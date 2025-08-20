import ExpressError from "./expressError.ts";
import { razorpayinstance } from "../razorpay.config.ts";
import crypto from "crypto";
import type { RazorpayOrderOptions , RazorpayOrderResponse , RazorpayVerifyParams} from "../types/razorpaytypes.ts"



/**
 * Utility to create a Razorpay order.
 * @param {number} amount - 
 * @param {string} currency 
 * @param {string} receipt
 * @returns {Promise<RazorpayOrderResponse>} 
 */


export const createRazorpayOrder = async (amount: number, currency = "INR",receipt = "order_rcptid_11"): Promise<RazorpayOrderResponse> => {
  const options: RazorpayOrderOptions = {
    amount: amount * 100, // Razorpay requires amount in paise
    currency,
    receipt,
  };

  const order = await razorpayinstance.orders.create(options);

  if (!order) {
    throw new ExpressError(500, "Error creating order from Razorpay!");
  }

  return order as RazorpayOrderResponse;
};

/**
 * Utility to verify Razorpay payment signature.
 * @param {RazorpayVerifyParams} params 
 * @param {string} secret 
 * @returns {boolean}
 */


export const verifyRazorpayPayment = (params: RazorpayVerifyParams,secret: string): boolean => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return generatedSignature === razorpay_signature;
};
