import { sendEmail } from "../sendEmail.ts";

export const sendTeamRequestEmail = async (
    inviteeEmail: string,
    inviteeName: string,
    inviterName: string,
    teamName: string,
    eventName: string
) => {
    const subject = `You're Invited to Join a Team for Aerophilia 2025`;

    const emailBody = `
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 600px; margin: 20px auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
  <div style="background-color: #0d47a1; color: #ffffff; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Aerophilia 2025</h1>
  </div>
  <div style="padding: 30px 25px; color: #333; line-height: 1.6;">
    <h2 style="color: #0d47a1; margin-top: 0;">You Have a Team Invitation!</h2>
    <p>Hi ${inviteeName},</p>
    <p><strong>${inviterName}</strong> has invited you to join team "<strong>${teamName}</strong>" for the upcoming event, <strong>${eventName}</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" target="_blank" style="background-color: #1976d2; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">View Invitation</a>
    </div>
    <p>Please log in to your Aerophilia account to accept or decline the invitation. If you were not expecting this, you can safely ignore this email.</p>
  </div>
  <div style="background-color: #f0f0f0; color: #777; padding: 15px; text-align: center; font-size: 12px;">
    <p style="margin: 0;">&copy; 2025 Aerophilia Team. All rights reserved.</p>
  </div>
</div>
    `;

    await sendEmail(inviteeEmail, subject, emailBody);
};