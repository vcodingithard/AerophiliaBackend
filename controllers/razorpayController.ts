import type { Request, Response } from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../utils/razorpayUtils.ts";
import type { RazorpayVerifyParams } from "../types/razorpaytypes.ts";
import { db, firestore } from "../firebase.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import { PaymentStatus } from "../types/firebasetypes.ts";
import { sendPaymentConfirmationEmail } from "../utils/sendEmails/paymentConfirmation.ts";


export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, currency = "INR", event_id, registration_id } = req.body;
  const user_id = req.user_id;

  if (!amount || !user_id || !event_id || !registration_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const receipt = `order_${user_id}_${Date.now()}`;

  const order = await createRazorpayOrder(amount, currency, receipt);

  // Save payment record in Firebase
  await db.collection("payments").doc(order.id).set({
    payment_id: order.id,
    user_id,
    event_id,
    amount,
    payment_method: "",
    receipt_url: "",
    any_notes: receipt,
    status: PaymentStatus.PENDING,
    time: firestore.FieldValue.serverTimestamp(),
  });

  res.status(200).json({ success: true, order });
});

// ------------------------
// Verify Razorpay Payment
// ------------------------
export const verifyPayment = asyncHandler(
  async (
    req: Request<{}, {}, RazorpayVerifyParams & { registration_id: string; event_id: string }>,
    res: Response
  ) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registration_id, event_id } =
      req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || "";

    if (!registration_id || !event_id) {
      return res.status(400).json({ message: "Registration ID and Event ID are required" });
    }

    const isValid = verifyRazorpayPayment(
      { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      secret
    );

    if (!isValid) {
      // Update payment status as FAILED
      await db.collection("payments").doc(razorpay_order_id).update({
        status: PaymentStatus.FAILED,
        verifiedAt: firestore.FieldValue.serverTimestamp(),
      });
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // Update payment status as COMPLETED
    await db.collection("payments").doc(razorpay_order_id).update({
      status: PaymentStatus.COMPLETED,
      payment_method: "razorpay",
      payment_id: razorpay_payment_id,
      verifiedAt: firestore.FieldValue.serverTimestamp(),
    });

    // Update registration status as completed and attach payment_id
    await db.collection("registrations").doc(registration_id).update({
      status: "completed",
      payment_id: razorpay_order_id,
    });

    // ------------------------
    // Send payment confirmation email asynchronously
    // ------------------------
    (async () => {
      try {
        // Fetch user and event details for email
        const regSnap = await db.collection("registrations").doc(registration_id).get();
        const regData = regSnap.data();
        const userSnap = await db.collection("users").doc(regData?.registrant_id).get();
        const userData = userSnap.data();
        const eventSnap = await db.collection("events").doc(event_id).get();
        const eventData = eventSnap.data();

        if (userData && eventData) {
          const paymentDetails = {
            transactionId: razorpay_payment_id,
            amount: regData?.amount || 0,
            date: new Date().toLocaleString(),
          };
          await sendPaymentConfirmationEmail(
            userData.email,
            userData.fullName,
            eventData.Title || "Event",
            paymentDetails
          );
        }
      } catch (err) {
        console.error("Failed to send payment confirmation email:", err);
      }
    })();

    res
      .status(200)
      .json({ success: true, message: "Payment verified and registration updated successfully" });
  }
);


export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ success: false, message: "Payment ID is required" });

  const paymentSnap = await db.collection("payments").doc(id).get();

  if (!paymentSnap.exists) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  res.status(200).json({ success: true, payment: paymentSnap.data() });
});
