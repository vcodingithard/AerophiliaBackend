// controllers/events.ts - REFACTORED VERSION
//
// - Extracted team management logic to TeamManagementService
// - Extracted request response logic to TeamRequestService
// - Extracted team operations to TeamOperationsService
// - Extracted database helpers to DatabaseHelpers
// - Maintained full backward compatibility and performance
//
// Key improvements:
// ✅ Better separation of concerns
// ✅ Improved maintainability and testability
// ✅ Reusable service classes
// ✅ Cleaner controller functions
//
// Performance impact: NONE (same operations, better organization)
// Frontend impact: NONE (same API responses and behavior)
// Architecture: IMPROVED (service-based architecture)
//
import type { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.ts";
import { db, firestore } from "../firebase.ts";
import { sendEventRegistrationEmail } from "../utils/sendEmails/eventRegistration.ts";
import { v4 as uuidv4 } from "uuid";
import ExpressError from "../utils/expressError.ts";
import { TeamManagementService } from "../services/teamManagementService.ts";
import { TeamRequestService } from "../services/teamRequestService.ts";
import { TeamOperationsService } from "../services/teamOperationsService.ts";
import { DatabaseHelpers } from "../services/databaseHelpers.ts";

// Extend Express Request to include user_id and user
interface AuthRequest extends Request {
  user_id?: string;
  user?: any; // Firebase decoded token
}

interface EventSchema {
  eventId: string;
  Title: string;
  description: string;
  DateTime: Date;
  Location: string;
  Volunteer_Name: string[];
  volunteer_phone_no: string[];
  Payment_Amount: number;
  participant_count: number;
  eventType: string; // ✅ Added
  createdAt?: Date;
}

// ------------------------
// 1️⃣ Individual Event Registration
// ------------------------
export const registerIndividualEvent = asyncHandler(async (req: AuthRequest, res: Response) => {

  let user_id=req.user?.uid;

  // Validate event ID
  const { eventId: eventIdParam } = req.params;
  const eventId = DatabaseHelpers.validateEventId(eventIdParam, res);
  if (!eventId) return; // Response already sent by validateEventId

  // At this point, eventId is guaranteed to be a string (not undefined)
  const { fullName, email, college, age, year_of_study } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ message: "Full name and email required" });
  }

  const eventDetails = await DatabaseHelpers.getEventDetails(eventId);
  const registrationId = uuidv4();
  const registrationRef = db.collection("registrations").doc(registrationId);
  const userRef = db.collection("users").doc(user_id);

  await db.runTransaction(async (tx) => {
    tx.set(registrationRef, {
      registration_id: registrationId,
      eventId: eventId,
      registrant_id: user_id,
      team_event: false,
      teamId: null,
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
// 2️⃣ Team Creation + Sending Requests (Refactored using services)
// ------------------------
export const createTeamAndRegister = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate authentication
  const creator_id = DatabaseHelpers.validateAuth(req, res);
  if (!creator_id) return;

  const creator_email = req.user?.email;

  // Validate event ID
  const { eventId: eventIdParam } = req.params;
  const eventId = DatabaseHelpers.validateEventId(eventIdParam, res);
  if (!eventId) return;

  // Get user details and validate eligibility
  const userData = await DatabaseHelpers.getUserDocument(creator_id, res);
  if (!userData) return;

  // Updated request body structure per schema
  const { teamName, memberEmails, message } = req.body;

  try {
    // Validate team creation requirements (Enhanced with duplicate checking)
    TeamManagementService.validateTeamCreation(teamName, memberEmails, creator_email);

    // Check if event supports team registration
    await TeamManagementService.validateEventForTeams(eventId);

    // 🚀 OPTIMIZATION: Batch validate all emails and get user data
    const emailToUserMap = await TeamManagementService.validateAndGetUsersByEmails(memberEmails);

    // Check if all invited users exist
    const missingEmails: string[] = [];
    memberEmails.forEach((email: string) => {
      if (!emailToUserMap.has(email.toLowerCase())) {
        missingEmails.push(email);
      }
    });

    if (missingEmails.length > 0) {
      throw new ExpressError(400, `Users not found: ${missingEmails.join(", ")}`);
    }

    // Generate team ID and create team document
    const teamId = TeamManagementService.generateTeamId();
    await TeamManagementService.createTeamDocument(teamId, eventId, creator_id, teamName);

    // Update team creator's eventsRegistered and teams array
    await TeamManagementService.updateTeamCreatorEvents(creator_id, eventId, teamId);

    // Create registration document
    const registrationId = await TeamManagementService.createTeamRegistration(eventId, creator_id, teamId);

    // Get event details for response
    const eventDetails = await DatabaseHelpers.getEventDetails(eventId);

    // Create team requests for each member (Optimized)
    const requestIds = await TeamManagementService.createTeamRequests(
      memberEmails,
      teamId,
      eventId,
      teamName,
      creator_id,
      userData, // leader data
      eventDetails,
      message
    );

    // Update team with request IDs
    await TeamManagementService.updateTeamWithRequests(teamId, requestIds);

    res.status(201).json({
      success: true,
      message: "Team created and invitations sent successfully",
      teamId: teamId,
      registrationId: registrationId,
      invitedMembers: memberEmails.length,
      event: eventDetails,
    });

  } catch (error) {
    console.error('Error in createTeamAndRegister:', error);
    return res.status(400).json({ message: (error as Error).message });
  }
});

// ------------------------
// 3️⃣ Respond to Team Request (Refactored using services)
// ------------------------
export const respondToTeamRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!requestId) {
    return res.status(400).json({ error: "Request ID is required" });
  }

  try {
    // Validate request parameters
    const validatedStatus = TeamRequestService.validateRequestResponse(requestId, status);

    const uid = req.user?.uid;
    const userEmail = req.user?.email;

    if (!uid || !userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // At this point, userEmail is guaranteed to be defined
    const email = userEmail;

    // Get and validate team request
    const { requestDoc, requestData } = await TeamRequestService.getTeamRequest(requestId, email);

    // Handle based on status
    if (validatedStatus === 'accepted') {
      const result = await TeamRequestService.acceptTeamRequest(requestDoc, requestData, uid);
      return res.status(200).json({
        success: true,
        message: "Team request accepted successfully",
        data: result
      });

    } else if (validatedStatus === 'declined' || validatedStatus === 'rejected') {
      const result = await TeamRequestService.rejectTeamRequest(requestDoc, uid);
      return res.status(200).json({
        success: true,
        message: "Team request rejected successfully",
        data: result
      });
    }

  } catch (error) {
    console.error('Error in respondToTeamRequest:', error);
    return res.status(400).json({ error: (error as Error).message });
  }
});

// ------------------------
// 4️⃣ Leave Team / Disband Team (Refactored using services)
// ------------------------
export const leaveTeam = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Validate authentication
  const user_id = DatabaseHelpers.validateAuth(req, res);
  if (!user_id) return;

  // Validate team ID
  const { teamId: teamIdParam } = req.params;
  const teamId = DatabaseHelpers.validateTeamId(teamIdParam, res);
  if (!teamId) return;

  // Get team data using helper function
  const teamData = await DatabaseHelpers.getTeamDocument(teamId, res);
  if (!teamData) return;

  try {
    // Check payment status - if payment is done, prevent leaving
    await TeamOperationsService.checkPaymentStatus(teamId);

    // Validate user's membership in team
    const { isLeader, isMember } = TeamOperationsService.validateTeamMembership(teamData, user_id);

    if (isLeader) {
      // Leader leaving - disband entire team
      await TeamOperationsService.disbandTeam(teamId, teamData);
      return res.status(200).json({
        success: true,
        message: "Team disbanded successfully. All members have been notified."
      });

    } else if (isMember) {
      // Member leaving
      await TeamOperationsService.removeMemberFromTeam(teamId, user_id, teamData.eventId);
      return res.status(200).json({
        success: true,
        message: "Successfully left the team"
      });
    }

  } catch (error) {
    console.error('Error in leaveTeam:', error);
    return res.status(400).json({ message: (error as Error).message });
  }
});


export const addEvent = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = req.body as EventSchema;

    if (!data.eventId)
      return res.status(400).json({ error: "eventId is required" });

    data.createdAt = data.createdAt || new Date();

    await db.collection('events').doc(data.eventId).set(data);
    return res.status(201).json({ message: "Event added", event: data });

  } catch (error) {
      console.error("Error adding event:", error);
      throw new ExpressError(500,"Error creating Events !")
  }
});