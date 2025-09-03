// controllers/registrationController.ts
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.ts";
import { db, firestore } from "../firebase.ts";
import { sendEventRegistrationEmail } from "../utils/sendEmails/eventRegistration.ts";
import { sendTeamRequestEmail } from "../utils/sendEmails/teamRequest.ts";
import { RequestStatus } from "../types/firebasetypes.ts";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request to include user_id
interface AuthRequest extends Request {
  user_id?: string;
}

// ------------------------
// 1️⃣ Individual Event Registration
// ------------------------
export const registerIndividualEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user_id) return res.status(401).json({ message: "Unauthorized" });
  const user_id = req.user_id;
  const { eventId } = req.params;
  if (!eventId) return res.status(400).json({ message: "Missing event ID" });

  const { fullName, email, college, age, year_of_study } = req.body as {
    fullName: string;
    email: string;
    college?: string;
    age?: number;
    year_of_study?: number;
  };

  if (!fullName || !email) return res.status(400).json({ message: "Full name and email required" });

  // Fetch event
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

  // Transaction ensures consistency
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

  // Fire email (non-blocking)
  sendEventRegistrationEmail(email, fullName, eventDetails).catch(console.error);

  res.status(201).json({
    success: true,
    message: "Registration successful",
    registration_id: registrationRef.id,
    event: eventDetails,
  });
});

// ------------------------
// 2️⃣ Team Creation + Sending Requests
// ------------------------
export const createTeamAndRegister = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user_id) return res.status(401).json({ message: "Unauthorized" });
  const creator_id = req.user_id;
  const { eventId } = req.params;
  if (!eventId) return res.status(400).json({ message: "Missing event ID" });

  const { team_name, college_name, member_ids } = req.body as {
    team_name: string;
    college_name: string;
    member_ids: string[];
  };

  if (!team_name || !college_name || !member_ids?.length) {
    return res.status(400).json({ message: "Missing required fields or members" });
  }

  // Create team doc
  const teamId = `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await db.collection("teams").doc(teamId).set({
    team_id: teamId,
    team_name,
    team_leader: creator_id,
    member_ids,
    college_name,
    member_count: member_ids.length + 1,
    payment_ids: [] as string[],
    events_ids: [eventId],
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // Fetch leader + event in parallel
  const [leaderSnap, eventSnap] = await Promise.all([
    db.collection("users").doc(creator_id).get(),
    db.collection("events").doc(eventId).get(),
  ]);
  const leaderData = leaderSnap.data();
  if (!leaderData) return res.status(404).json({ message: "Team leader not found" });

  const eventDetails = {
    name: eventSnap.data()?.Title ?? "Event",
    date: eventSnap.data()?.DateTime?.toDate() ?? new Date(),
    location: eventSnap.data()?.Location ?? "N/A",
  };

  // Send requests to members in parallel
  await Promise.all(
    member_ids.map(async (memberId) => {
      const memberSnap = await db.collection("users").doc(memberId).get();
      const memberData = memberSnap.data();
      if (!memberData) return;

      const requestId = uuidv4();
      await db.collection("requests").doc(requestId).set({
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
        requested_time: firestore.FieldValue.serverTimestamp(),
        request_url: `/accept-invite/${requestId}`,
      });

      sendTeamRequestEmail(memberData.email, memberData.fullName, leaderData.fullName, team_name, eventId)
        .catch(console.error);
    })
  );

  res.status(201).json({
    success: true,
    message: "Team created and requests sent. Members must accept before registration.",
    team_id: teamId,
    event: eventDetails,
  });
});

// ------------------------
// 3️⃣ Respond to Team Request (Accept / Decline)
// ------------------------
export const respondToTeamRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { requestId } = req.params as { requestId: string };
  const { status } = req.body as { status: "ACCEPTED" | "DECLINED" };

  if (!requestId || !status) return res.status(400).json({ message: "Request ID and status required" });
  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const requestRef = db.collection("requests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) return res.status(404).json({ message: "Request not found" });

  await requestRef.update({
    status,
    responded_time: firestore.FieldValue.serverTimestamp(),
  });

  const updatedSnap = await requestRef.get();
  res.status(200).json({ success: true, request: updatedSnap.data() });
});
