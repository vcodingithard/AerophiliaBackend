// controllers/registrationController.ts
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.ts";
import { db, firestore } from "../firebase.ts";
import { sendEventRegistrationEmail } from "../utils/sendEmails/eventRegistration.ts";
import { sendTeamRequestEmail } from "../utils/sendEmails/teamRequest.ts";
import { RequestStatus } from "../types/firebasetypes.ts";
import { v4 as uuidv4 } from "uuid";
import ExpressError from "../utils/expressError.ts";
import { checkEventExists } from "../utils/checkEventIdValid.ts";

// Extend Express Request to include user_id
interface AuthRequest extends Request {
  user_id?: string;
}

interface EventSchema {
  event_id: string;
  Title: string;
  description: string;
  DateTime: Date;
  Location: string;
  Volunteer_Name: string[];
  volunteer_phone_no: string[];
  Payment_Amount: number;
  participant_count: number;
  createdAt?: Date;
}

// Helper to fetch event details
async function getEventDetails(eventId: string) {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) throw new Error("Event not found");
  const eventData = eventSnap.data();
  return {
    name: eventData?.Title ?? "Event",
    date: eventData?.DateTime?.toDate?.() ?? new Date(),
    location: eventData?.Location ?? "N/A",
  };
}

// ------------------------
// 1️⃣ Individual Event Registration
// ------------------------
export const registerIndividualEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user_id) return res.status(401).json({ message: "Unauthorized" });
  const user_id = req.user_id;
  const { eventId } = req.params;
  const email = req.user?.email;
  console.log("User Email is : ", email)

  if (!email)
    return res.status(400).json({ message: "User email missing" });


  if (!eventId || !checkEventExists(eventId))
    return res.status(400).json({ message: "Missing event ID" });

  const { fullName, college, age, year_of_study } = req.body;

  if (!fullName || !college || !age || !year_of_study) {
    return res.status(400).json({ message: "Invalid Credentials" });
  }

  const eventDetails = await getEventDetails(eventId);
  const registrationId = uuidv4();
  const registrationRef = db.collection("registrations").doc(registrationId);
  const userRef = db.collection("users").doc(user_id);

  console.log("User Found is : ", userRef)

  await db.runTransaction(async (tx) => {
    tx.set(registrationRef, {
      registration_id: registrationId,
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
    success: true,
    message: "Registration successful",
    registration_id: registrationId,
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

  const { team_name, college_name, member_ids } = req.body;
  if (!team_name || !college_name || !member_ids?.length) {
    return res.status(400).json({ message: "Missing required fields or members" });
  }

  const teamId = `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await db.collection("teams").doc(teamId).set({
    team_id: teamId,
    team_name,
    team_leader: creator_id,
    member_ids: [creator_id],
    college_name,
    member_count: 1,
    payment_ids: [],
    events_ids: [eventId],
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  const [leaderSnap, eventDetails] = await Promise.all([
    db.collection("users").doc(creator_id).get(),
    getEventDetails(eventId),
  ]);

  const leaderData = leaderSnap.data();
  if (!leaderData) return res.status(404).json({ message: "Team leader not found" });

  await Promise.all(
    member_ids.map(async (memberId: string) => {
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
        team_id: teamId,
        event_id: eventId,
      });

      sendTeamRequestEmail(memberData.email, memberData.fullName, leaderData.fullName, team_name, eventDetails.name, requestId)
        .catch(console.error);
    })
  );

  res.status(201).json({
    success: true,
    message: "Team created and invitations sent.",
    team_id: teamId,
    event: eventDetails,
  });
});

// ------------------------
// 3️⃣ Respond to Team Request (Accept / Decline) + Cleanup
// ------------------------
export const respondToTeamRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user_id) return res.status(401).json({ message: "Unauthorized" });
  const user_id = req.user_id;
  const { requestId } = req.params;
  const { status } = req.body;

  if (!requestId || !status) return res.status(400).json({ message: "Request ID and status required" });
  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const requestRef = db.collection("requests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) return res.status(404).json({ message: "Request not found" });

  const requestData = requestSnap.data()!;
  if (requestData.status !== RequestStatus.PENDING) {
    return res.status(400).json({ message: "Request already responded to" });
  }

  await requestRef.update({
    status,
    responded_time: firestore.FieldValue.serverTimestamp(),
  });

  // --------------------
  // Case 1: ACCEPTED
  // --------------------
  if (status === "ACCEPTED") {
    const teamRef = db.collection("teams").doc(requestData.team_id);
    const userRef = db.collection("users").doc(user_id);
    const registrationId = uuidv4();
    const registrationRef = db.collection("registrations").doc(registrationId);

    await db.runTransaction(async (tx) => {
      tx.update(teamRef, {
        member_ids: firestore.FieldValue.arrayUnion(user_id),
        member_count: firestore.FieldValue.increment(1),
      });

      tx.update(userRef, {
        team_id: requestData.team_id,
        events_registered: firestore.FieldValue.arrayUnion(requestData.event_id),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      tx.set(registrationRef, {
        registration_id: registrationId,
        event_id: requestData.event_id,
        registrant_id: user_id,
        team_event: true,
        team_id: requestData.team_id,
        payment_id: null,
        status: "incomplete",
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    });
  }

  // --------------------
  // Case 2: DECLINED → Check cleanup
  // --------------------
  if (status === "DECLINED") {
    const teamRef = db.collection("teams").doc(requestData.team_id);
    const teamSnap = await teamRef.get();
    if (teamSnap.exists) {
      const teamData = teamSnap.data()!;

      // Fetch all requests for this team
      const requestsSnap = await db.collection("requests")
        .where("team_id", "==", requestData.team_id)
        .get();

      const requests = requestsSnap.docs.map((doc) => doc.data());
      const anyAccepted = requests.some((r) => r.status === RequestStatus.ACCEPTED);
      const anyPending = requests.some((r) => r.status === RequestStatus.PENDING);

      // If no accepted and no pending → everyone declined
      if (!anyAccepted && !anyPending && teamData.member_ids.length === 1) {
        const leaderId = teamData.team_leader;

        // Transaction → delete team + reset leader’s team_id
        await db.runTransaction(async (tx) => {
          tx.delete(teamRef);
          tx.update(db.collection("users").doc(leaderId), {
            team_id: firestore.FieldValue.delete(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        });
      }
    }
  }

  res.status(200).json({ success: true, message: `Request ${status.toLowerCase()}` });
});


export const addEvent = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = req.body as EventSchema;

    if (!data.event_id)
      return res.status(400).json({ error: "event_id is required" });

    data.createdAt = data.createdAt || new Date();

    await db.collection('events').doc(data.event_id).set(data);
    return res.status(201).json({ message: "Event added", event: data });

  } catch (error) {
    console.error("Error adding event:", error);
    throw new ExpressError(500, "Error creating Events !")
  }
});


export const getEventByType = asyncHandler(async (req: Request, res: Response) => {
  const eventType = (req.query.eventType as string | undefined)?.trim();

  if (!eventType) {
    return res.status(400).json({ error: "Event Type is required" });
  }

  const snapshot = await db
    .collection("events")
    .where("eventType", "==", eventType)
    .get();

  const events = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (events.length === 0) {
    return res.status(404).json({ error: "No events found for the given eventType!" });
  }

  return res.status(200).json({ success: true, events });
});
