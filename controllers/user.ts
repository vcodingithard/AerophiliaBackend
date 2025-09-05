import type { Request, Response } from "express";
import { db } from "../firebase.js";
import asyncHandler from "../utils/asyncHandler.js";
import ExpressError from "../utils/expressError.js";

// GET /registrations/completed
// Fetch completed registrations from user's registrations field
export const getCompletedRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;

  if (!userId) {
    throw new ExpressError(400, "User ID is required");
  }

  
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new ExpressError(404, "User not found");
  }

  const userData = userDoc.data();
  const registrationIds = userData?.registrations || [];

  if (registrationIds.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No registrations found",
      data: [],
      total: 0
    });
  }

  const registrationPromises = registrationIds.map(async (regId: string) => {
    const regDoc = await db.collection("registrations").doc(regId).get();
    if (regDoc.exists) {
      return {
        registrationId: regDoc.id,
        ...regDoc.data()
      };
    }
    return null;
  });

  const allRegistrations = await Promise.all(registrationPromises);
  const validRegistrations = allRegistrations.filter(reg => reg !== null);

  
  const completedRegistrations = validRegistrations.filter(reg => reg.status === true);

  if (completedRegistrations.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No completed registrations found",
      data: [],
      total: 0
    });
  }

  
  const eventDetailsPromises = completedRegistrations.map(async (registration: any) => {
    // Fetch event details
    const eventDoc = await db.collection("events").doc(registration.eventId).get();
    
    // Fetch payment details if payment exists
    let paymentDetails = null;
    if (registration.payment) {
      const paymentDoc = await db.collection("payments").doc(registration.payment).get();
      if (paymentDoc.exists) {
        paymentDetails = {
          id: paymentDoc.id,
          ...paymentDoc.data()
        };
      }
    }
    
    return {
      event: {
        id: registration.eventId,
        name: eventDoc.exists ? eventDoc.data()?.name : "Unknown Event",
        ...eventDoc.data()
      },
      registration: {
        id: registration.registrationId,
        registrant: registration.registrant,
        status: registration.status,
        teamId: registration.teamId,
        createdAt: registration.createdAt
      },
      payment: paymentDetails
    };
  });

  const completedEventsData = await Promise.all(eventDetailsPromises);

  return res.status(200).json({
    success: true,
    message: "Completed registrations fetched successfully",
    data: completedEventsData,
    total: completedEventsData.length
  });
});

// GET /registrations/incomplete
// Fetch incomplete registrations from user's registrations field where status=false
export const getIncompleteRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;

  if (!userId) {
    throw new ExpressError(400, "User ID is required");
  }

  // Step 1: Get user document to fetch registrations array
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new ExpressError(404, "User not found");
  }

  const userData = userDoc.data();
  const registrationIds = userData?.registrations || [];

  if (registrationIds.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No registrations found",
      data: [],
      total: 0
    });
  }

  // Step 2: Fetch all registration documents for the user
  const registrationPromises = registrationIds.map(async (regId: string) => {
    const regDoc = await db.collection("registrations").doc(regId).get();
    if (regDoc.exists) {
      return {
        registrationId: regDoc.id,
        ...regDoc.data()
      };
    }
    return null;
  });

  const allRegistrations = await Promise.all(registrationPromises);
  const validRegistrations = allRegistrations.filter(reg => reg !== null);

  // Step 3: Filter only incomplete registrations (status = false)
  const incompleteRegistrations = validRegistrations.filter(reg => reg.status === false);

  if (incompleteRegistrations.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No incomplete registrations found",
      data: [],
      total: 0
    });
  }

  // Step 4: Fetch event details and payment details for incomplete registrations
  const eventDetailsPromises = incompleteRegistrations.map(async (registration: any) => {
    // Fetch event details
    const eventDoc = await db.collection("events").doc(registration.eventId).get();
    
    // Fetch payment details if payment exists
    let paymentDetails = null;
    if (registration.payment) {
      const paymentDoc = await db.collection("payments").doc(registration.payment).get();
      if (paymentDoc.exists) {
        paymentDetails = {
          id: paymentDoc.id,
          ...paymentDoc.data()
        };
      }
    }
    
    return {
      event: {
        id: registration.eventId,
        name: eventDoc.exists ? eventDoc.data()?.name : "Unknown Event",
        ...eventDoc.data()
      },
      registration: {
        id: registration.registrationId,
        registrant: registration.registrant,
        status: registration.status,
        teamId: registration.teamId,
        createdAt: registration.createdAt
      },
      payment: paymentDetails
    };
  });

  const incompleteEventsData = await Promise.all(eventDetailsPromises);

  return res.status(200).json({
    success: true,
    message: "Incomplete registrations fetched successfully",
    data: incompleteEventsData,
    total: incompleteEventsData.length
  });
});