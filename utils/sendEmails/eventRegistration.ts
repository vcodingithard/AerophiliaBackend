import { sendEmail } from "../sendEmail.ts";

interface EventDetails {
    name: string;
    date: string;
    location: string;
}

export const sendEventRegistrationEmail = async (
    userEmail: string,
    userName: string,
    event: EventDetails
) => {
    const subject = `You're Confirmed for ${event.name}!`;

    const emailBody = `
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 20px auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
  <div style="background-color: #0d47a1; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Aerophilia 2025</h1>
  </div>
  <div style="padding: 30px 25px; color: #333; line-height: 1.6;">
    <h2 style="color: #0d47a1; margin-top: 0;">Registration Confirmed!</h2>
    <p>Hello ${userName},</p>
    <p>Get ready! You have successfully registered for an event at Aerophilia 2025. We're thrilled to have you join us.</p>
    <div style="background-color: #ffffff; border: 1px solid #eee; border-radius: 5px; padding: 20px; margin-top: 25px;">
      <h3 style="margin-top:0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Your Event Details</h3>
      <p style="margin: 10px 0;"><strong>Event:</strong> ${event.name}</p>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${event.date}</p>
      <p style="margin: 10px 0;"><strong>Location:</strong> ${event.location}</p>
    </div>
    <p style="margin-top: 30px;">If you have any questions, feel free to reply to this email. We look forward to seeing you there!</p>
  </div>
  <div style="background-color: #f0f0f0; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">&copy; 2025 Aerophilia Team. All rights reserved.</p>
  </div>
</div>
    `;

    await sendEmail(userEmail, subject, emailBody);
};