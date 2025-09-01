// controllers/registrationController.ts
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.ts";
import { db, firestore } from "../firebase.ts";
import { sendEventRegistrationEmail } from "../utils/sendEmails/eventRegistration.ts";
import { sendTeamRequestEmail } from "../utils/sendEmails/teamRequest.ts";
import { RequestStatus } from "../types/firebasetypes.ts";
import { v4 as uuidv4 } from "uuid";

// ------------------------
// 1️⃣ Individual Event Registration
// ------------------------
export const registerIndividualEvent = asyncHandler(async (req: Request, res: Response) => {
  const user_id = req.user_id;
  const eventId = req.params.eventId;
  if (!user_id || !eventId) return res.status(400).json({ message: "Missing required fields" });

  const { fullName, email, college, age, year_of_study } = req.body;
  if (!fullName || !email) return res.status(400).json({ message: "Full name and email required" });

  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) return res.status(404).json({ message: "Event not found" });

  const eventData = eventSnap.data();
  const eventDetails = {
    name: eventData?.Title ?? "Event",
    date: eventData?.DateTime?.toDate ? eventData.DateTime.toDate() : new Date(),
    location: eventData?.Location ?? "N/A",
  };

  const registrationRef = db.collection("registrations").doc();
  const userRef = db.collection("users").doc(user_id);

  await db.runTransaction(async (tx) => {
    tx.set(registrationRef, {
      registration_id: registrationRef.id,
      event_id: eventId,
      registrant_id: user_id,
      team_event: false,
      team_id: null,
      payment_id: null,
      status: "incomplete",
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    tx.update(userRef, {
      fullName,
      email,
      college,
      age,
      year_of_study,
      events_registered: firestore.FieldValue.arrayUnion(eventId),
      paid: false,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  sendEventRegistrationEmail(email, fullName, eventDetails).catch(console.error);

  res.status(201).json({
    message: "Registration successful",
    registration_id: registrationRef.id,
    event: eventDetails,
  });
});

// ------------------------
// 2️⃣ Team Creation & Team Requests
// ------------------------
export const createTeamAndSendRequests = asyncHandler(async (req: Request, res: Response) => {
  const eventId = req.params.eventId;
  const creator_id = req.user_id;
  const { team_name, college_name, member_ids } = req.body;

  if (!eventId) return res.status(400).json({ message: "Event ID required" });
  if (!team_name || !college_name || !member_ids || !Array.isArray(member_ids) || member_ids.length === 0) {
    return res.status(400).json({ message: "Missing required fields or members" });
  }

  const teamId = `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const teamDoc = {
    team_id: teamId,
    team_name,
    team_leader: creator_id,
    member_ids,
    college_name,
    member_count: member_ids.length + 1,
    payment_ids: [],
    events_ids: [eventId],
    createdAt: new Date(),
  };

  await db.collection("teams").doc(teamId).set(teamDoc);
  if (!creator_id) return res.status(400).json({ message: "User not authenticated" });

  const leaderSnap = await db.collection("users").doc(creator_id).get();
  const leaderData = leaderSnap.data();

  if (!leaderData) return res.status(404).json({ message: "Team leader not found" });

  // Send requests to members
  for (const memberId of member_ids) {
    const memberSnap = await db.collection("users").doc(memberId).get();
    const memberData = memberSnap.data();
    if (!memberData) continue;

    const requestId = uuidv4();
    const requestDoc = {
      request_id: requestId,
      sender_id: creator_id,
      receiver_id: memberId,
      sender_name: leaderData.fullName,
      receiver_name: memberData.fullName,
      sender_email: leaderData.email,
      receiver_email: memberData.email,
      message_title: `Team Invitation for ${team_name}`,
      message_body: `${leaderData.fullName} invited you to join the team "${team_name}"`,
      status: RequestStatus.PENDING,
      requested_time: new Date(),
      request_url: `/accept-invite/${requestId}`,
    };

    await db.collection("requests").doc(requestId).set(requestDoc);

    (async () => {
      try {
        await sendTeamRequestEmail(memberData.email, memberData.fullName, leaderData.fullName, team_name, eventId);
      } catch (err) {
        console.error("Failed to send team invitation email:", err);
      }
    })();
  }

  res.status(201).json({
    success: true,
    message: "Team created and requests sent",
    team_id: teamId,
  });
});

// ------------------------
// Respond to Team Request (Accept / Decline)
// ------------------------
export const respondToTeamRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { status } = req.body; // ACCEPTED or DECLINED

  if (!requestId || !status) return res.status(400).json({ message: "Request ID and status required" });
  if (![RequestStatus.ACCEPTED, RequestStatus.DECLINED].includes(status)) return res.status(400).json({ message: "Invalid status" });

  const requestRef = db.collection("requests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) return res.status(404).json({ message: "Request not found" });

  await requestRef.update({ status, responded_time: new Date() });

  res.status(200).json({ success: true, message: `Team invitation ${status.toLowerCase()}` });
});

// ------------------------
// 3️⃣ Team Registration
// ------------------------
export const registerTeam = asyncHandler(async (req: Request, res: Response) => {
  const teamId = req.params.teamId;
  const eventId = req.body.eventId;
  const user_id = req.user_id;

  if (!teamId || !eventId || !user_id) return res.status(400).json({ message: "Missing required fields" });

  const registrationRef = db.collection("registrations").doc();
  await db.collection("registrations").doc(registrationRef.id).set({
    registration_id: registrationRef.id,
    event_id: eventId,
    registrant_id: user_id,
    team_event: true,
    team_id: teamId,
    payment_id: null,
    status: "incomplete",
    createdAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: "Team registration created",
    registration_id: registrationRef.id,
  });
});
