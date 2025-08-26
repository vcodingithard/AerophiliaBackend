import { sendEmail } from "../sendEmail.ts";

interface PaymentDetails {
    transactionId: string;
    amount: number;
    date: string;
}

export const sendPaymentConfirmationEmail = async (
    userEmail: string,
    userName: string,
    eventName: string,
    payment: PaymentDetails
) => {
    const subject = `Your Payment Confirmation for ${eventName}`;

    const emailBody = `
<div style="font-family:  Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 20px auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
  <div style="background-color: #2e7d32; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Payment Successful!</h1>
  </div>
  <div style="padding: 30px 25px; color: #333; line-height: 1.6;">
    <h2 style="color: #2e7d32; margin-top: 0;">Thank You, ${userName}!</h2>
    <p>We have successfully received your payment for <strong>${eventName}</strong> at sasta-synergia 2025. Your registration is now fully confirmed.</p>
    <div style="background-color: #ffffff; border: 1px solid #eee; border-radius: 5px; padding: 20px; margin-top: 25px;">
      <h3 style="margin-top:0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Receipt Summary</h3>
      <p style="margin: 10px 0;"><strong>Transaction ID:</strong> ${payment.transactionId}</p>
      <p style="margin: 10px 0; "><strong>Amount Paid:</strong>${payment.amount.toFixed(2)}</p>
      <p style="margin: 10px 0;"><strong>Payment Date:</strong> ${payment.date}</p>
    </div>
    <p style="margin-top: 30px;">We're excited to see you at the event!</p>
  </div>
  <div style="background-color: #f0f0f0; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">&copy; 2025 Aerophilia Team. All rights reserved.</p>
  </div>
</div>
    `;

    await sendEmail(userEmail, subject, emailBody);
};