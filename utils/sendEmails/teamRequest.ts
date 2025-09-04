import { sendEmail } from "../sendEmail.ts";

export const sendTeamRequestEmail = async (
  inviteeEmail: string,
  inviteeName: string,
  inviterName: string,
  teamName: string,
  eventName: string,
  requestId: string
) => {
  const baseUrl = process.env.FRONTEND_URL || "https://aerophilia.com";

  // Frontend route that will call backend once clicked
  const acceptUrl = `${baseUrl}/team/respond/${requestId}?status=ACCEPTED`;
  const declineUrl = `${baseUrl}/team/respond/${requestId}?status=DECLINED`;

  const subject = `You're Invited to Join Team "${teamName}" for ${eventName}`;

  const emailBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
  <div style="background: #0d47a1; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Aerophilia 2025</h1>
  </div>
  <div style="padding: 25px; color: #333; line-height: 1.6;">
    <h2 style="color: #0d47a1;">Team Invitation</h2>
    <p>Hi <strong>${inviteeName}</strong>,</p>
    <p><strong>${inviterName}</strong> has invited you to join team "<strong>${teamName}</strong>" for the event <strong>${eventName}</strong>.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept</a>
      <a href="${declineUrl}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Decline</a>
    </div>
    <p>Note: Once you click, your response will be recorded and cannot be changed.</p>
    <p>If you were not expecting this invitation, you can safely ignore this email.</p>
  </div>
  <div style="background: #f0f0f0; color: #777; padding: 10px; text-align: center; font-size: 12px;">
    © 2025 Aerophilia Team. All rights reserved.
  </div>
</div>
  `;

  await sendEmail(inviteeEmail, subject, emailBody);
};
