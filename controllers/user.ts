import type { Request, Response } from "express";
import { db } from "../firebase.ts";
import asyncHandler from "../utils/asyncHandler.ts";
import ExpressError from "../utils/expressError.ts";
import { FieldValue } from "firebase-admin/firestore";


export const handleInitialUserSignUp = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.uid;
    const userEmail = req.user?.email || null;

    if (!userId) {
      throw new ExpressError(400, "User ID is required!");
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const userData = { email: userEmail };

      await userRef.set(userData);

      return res.status(201).json({
        success: true,
        message: "User created successfully!",
        data: { id: userId, ...userData },
      });
    }

    return res.status(200).json({
      success: true,
      message: "User already exists.",
      data: { id: userId, ...userDoc.data() },
    });
  }
);


/**
 * GET /users/me
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user?.uid;

  if (!uid) throw new ExpressError(401, "Unauthorized");

  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) throw new ExpressError(404, "User profile not found");

  return res.json({ id: userDoc.id, ...userDoc.data() });
});

/**
 * PATCH /users/me
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user?.uid;

  if (!uid) throw new ExpressError(401, "Unauthorized");

  const { name, phone, addRegistration } = req.body;

  if (req.body.userId || req.body.email || req.body.createdAt) {
    throw new ExpressError(400, "Cannot modify protected fields");
  }

  const userRef = db.collection("users").doc(uid);
  const updates: Record<string, unknown> = {};

  if (name) updates.name = name;
  if (phone) updates.phone = phone;
  if (addRegistration) updates.registrations = FieldValue.arrayUnion(addRegistration);

  await userRef.update(updates);

  const updatedDoc = await userRef.get();
  return res.json({ id: updatedDoc.id, ...updatedDoc.data() });
});

/**
 * POST /users/complete
 */
export const completeProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;

  if (!userId) throw new ExpressError(401, "Unauthorized: User ID missing");

  const {
    username,
    email,
    college_name,
    events_registered = [],
    DOB,
    Bio,
    Social_Links = [],
  } = req.body;

  if (!username || !email || !college_name || !DOB) {
    throw new ExpressError(400, "Missing required fields");
  }

  // 1️⃣ Profile data
  const profileData = {
    user_id: userId,
    username,
    email,
    college_name,
    events_registered,
    DOB: new Date(DOB),
    Bio,
    Social_Links,
    updatedAt: new Date(),
  };

  const profileRef = db.collection("profiles").doc(userId);
  const existingProfile = await profileRef.get();

  if (existingProfile.exists) {
    await profileRef.update(profileData);
  } else {
    await profileRef.set({ ...profileData, createdAt: new Date() });
  }

  // 2️⃣ Ensure user exists in 'users' collection
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    const newUser = {
      id: userId,
      email,
      fullName: username,
      team_id: "",
      events_registered: events_registered || [],
      paid: false,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await userRef.set(newUser);
  }

  return res.status(existingProfile.exists ? 200 : 201).json({
    success: true,
    message: existingProfile.exists ? "Profile updated successfully" : "Profile created successfully",
    data: { id: userId, ...profileData },
  });
});


/**
 * GET /registrations/completed
 */
export const getCompletedRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;
  if (!userId) throw new ExpressError(400, "User ID is required");

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new ExpressError(404, "User not found");

  const registrationIds = userDoc.data()?.registrations || [];
  if (registrationIds.length === 0) {
    return res.status(200).json({ success: true, message: "No registrations found", data: [], total: 0 });
  }

  const allRegistrations = (
    await Promise.all(
      registrationIds.map(async (regId: string) => {
        const regDoc = await db.collection("registrations").doc(regId).get();
        return regDoc.exists ? { registrationId: regDoc.id, ...regDoc.data() } : null;
      })
    )
  ).filter(Boolean);

  const completedRegistrations = allRegistrations.filter((reg: any) => reg.status === true);

  const completedEventsData = await Promise.all(
    completedRegistrations.map(async (registration: any) => {
      const eventDoc = await db.collection("events").doc(registration.eventId).get();
      let paymentDetails = null;
      if (registration.payment) {
        const paymentDoc = await db.collection("payments").doc(registration.payment).get();
        if (paymentDoc.exists) paymentDetails = { id: paymentDoc.id, ...paymentDoc.data() };
      }
      return {
        event: {
          id: registration.eventId,
          name: eventDoc.exists ? eventDoc.data()?.name : "Unknown Event",
          ...eventDoc.data(),
        },
        registration: {
          id: registration.registrationId,
          registrant: registration.registrant,
          status: registration.status,
          teamId: registration.teamId,
          createdAt: registration.createdAt,
        },
        payment: paymentDetails,
      };
    })
  );

  return res.status(200).json({
    success: true,
    message: "Completed registrations fetched successfully",
    data: completedEventsData,
    total: completedEventsData.length,
  });
});

/**
 * GET /registrations/incomplete
 */
export const getIncompleteRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;
  if (!userId) throw new ExpressError(400, "User ID is required");

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) throw new ExpressError(404, "User not found");

  const registrationIds = userDoc.data()?.registrations || [];
  if (registrationIds.length === 0) {
    return res.status(200).json({ success: true, message: "No registrations found", data: [], total: 0 });
  }

  const allRegistrations = (
    await Promise.all(
      registrationIds.map(async (regId: string) => {
        const regDoc = await db.collection("registrations").doc(regId).get();
        return regDoc.exists ? { registrationId: regDoc.id, ...regDoc.data() } : null;
      })
    )
  ).filter(Boolean);

  const incompleteRegistrations = allRegistrations.filter((reg: any) => reg.status === false);

  const incompleteEventsData = await Promise.all(
    incompleteRegistrations.map(async (registration: any) => {
      const eventDoc = await db.collection("events").doc(registration.eventId).get();
      let paymentDetails = null;
      if (registration.payment) {
        const paymentDoc = await db.collection("payments").doc(registration.payment).get();
        if (paymentDoc.exists) paymentDetails = { id: paymentDoc.id, ...paymentDoc.data() };
      }
      return {
        event: {
          id: registration.eventId,
          name: eventDoc.exists ? eventDoc.data()?.name : "Unknown Event",
          ...eventDoc.data(),
        },
        registration: {
          id: registration.registrationId,
          registrant: registration.registrant,
          status: registration.status,
          teamId: registration.teamId,
          createdAt: registration.createdAt,
        },
        payment: paymentDetails,
      };
    })
  );

  return res.status(200).json({
    success: true,
    message: "Incomplete registrations fetched successfully",
    data: incompleteEventsData,
    total: incompleteEventsData.length,
  });
});



export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.uid;

  if (!userId) {
    throw new ExpressError(401, "Unauthorized: User ID missing");
  }

  const profileRef = db.collection("profiles").doc(userId);
  const profileDoc = await profileRef.get();

  if (!profileDoc.exists) {
    return res.status(404).json({
      success: false,
      message: "Profile not found",
      data: null,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Profile fetched successfully",
    data: { id: profileDoc.id, ...profileDoc.data() },
  });
});