import { db, firestore } from "../firebase.ts";
import { sendTeamRequestEmail } from "../utils/sendEmails/teamRequest.ts";
import { v4 as uuidv4 } from "uuid";

export class TeamManagementService {
  /**
   * Validates team creation requirements (Enhanced)
   */
  static validateTeamCreation(teamName: string, memberEmails: string[], creatorEmail: string) {
    if (!teamName || !memberEmails?.length) {
      throw new Error("Team name and member emails required");
    }

    // Check for duplicate emails
    const uniqueEmails = [...new Set(memberEmails.map(email => email.toLowerCase()))];
    if (uniqueEmails.length !== memberEmails.length) {
      throw new Error("Duplicate emails found in invitation list");
    }

    // Prevent leader from inviting themselves
    if (creatorEmail && uniqueEmails.includes(creatorEmail.toLowerCase())) {
      throw new Error("You cannot invite yourself to your own team");
    }

    // Validate team size (2-4 members including leader)
    const totalMembers = uniqueEmails.length + 1; // +1 for leader
    if (totalMembers < 2 || totalMembers > 4) {
      throw new Error("Team must have 2-4 members including leader");
    }
  }

  /**
   * Batch validates emails and checks if users exist (Optimized)
   */
  static async validateAndGetUsersByEmails(emails: string[]): Promise<Map<string, any>> {
    const normalizedEmails = [...new Set(emails.map(email => email.toLowerCase()))];
    const emailToUserMap = new Map<string, any>();

    // Process emails in batches of 10 (Firestore 'in' query limit)
    const batchSize = 10;
    for (let i = 0; i < normalizedEmails.length; i += batchSize) {
      const emailBatch = normalizedEmails.slice(i, i + batchSize);
      const userSnap = await db.collection("users").where("email", "in", emailBatch).get();

      userSnap.docs.forEach(doc => {
        const userData = doc.data();
        if (userData?.email) {
          emailToUserMap.set(userData.email.toLowerCase(), { id: doc.id, ...userData });
        }
      });
    }

    return emailToUserMap;
  }

  /**
   * Checks if event supports team registration
   */
  static async validateEventForTeams(eventId: string) {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) {
      throw new Error("Event not found");
    }

    const eventData = eventSnap.data();
    if (eventData?.eventType !== "Group") {
      throw new Error("This event does not support team registration");
    }

    return eventData;
  }

  /**
   * Creates team document in database (Optimized)
   */
  static async createTeamDocument(teamId: string, eventId: string, creatorId: string, teamName: string) {
    const teamData = {
      teamId: teamId,
      eventId: eventId,
      leader: creatorId,
      teamName: teamName,
      members: [creatorId], // Initially only leader
      requestIds: [], // Will be populated with request IDs
      status: "pending",
      paymentStatus: false,
      minSize: 2,
      maxSize: 4,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("teams").doc(teamId).set(teamData);
    return teamData;
  }

  /**
   * Updates team creator's teams field (without eventsRegistered until payment)
   */
  static async updateTeamCreatorEvents(creatorId: string, eventId: string, teamId: string) {
    await db.collection("users").doc(creatorId).update({
      teams: firestore.FieldValue.arrayUnion(teamId), // ✅ Add team to user's teams array
      updatedAt: firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Creates registration document for team
   */
  static async createTeamRegistration(eventId: string, creatorId: string, teamId: string) {
    const registrationId = uuidv4();
    const registrationData = {
      registration_id: registrationId,
      eventId: eventId,
      registrant_id: creatorId,
      team_event: true,
      teamId: teamId,
      payment_id: null,
      status: "incomplete",
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("registrations").doc(registrationId).set(registrationData);
    return registrationId;
  }

  /**
   * Creates team invitation requests for members (Optimized for Performance)
   */
  static async createTeamRequests(
    memberEmails: string[],
    teamId: string,
    eventId: string,
    teamName: string,
    creatorId: string,
    leaderData: any,
    eventDetails: any,
    message?: string
  ) {
    const requestIds: string[] = [];

    try {
      // 🚀 OPTIMIZATION: Normalize emails and remove duplicates
      const normalizedEmails = [...new Set(memberEmails.map(email => email.toLowerCase()))];

      // 🚀 OPTIMIZATION: Batch validate all users exist with single query
      // Firestore 'in' query supports up to 10 values, so we need to batch if more than 10
      const batchSize = 10;
      const userValidationPromises: Promise<any>[] = [];

      for (let i = 0; i < normalizedEmails.length; i += batchSize) {
        const emailBatch = normalizedEmails.slice(i, i + batchSize);
        userValidationPromises.push(
          db.collection("users").where("email", "in", emailBatch).get()
        );
      }

      const userSnapshots = await Promise.all(userValidationPromises);
      const allUsers = userSnapshots.flatMap(snapshot => snapshot.docs);

      // Create email to user data mapping
      const emailToUserMap = new Map();
      allUsers.forEach(doc => {
        const userData = doc.data();
        if (userData?.email) {
          emailToUserMap.set(userData.email.toLowerCase(), { id: doc.id, ...userData });
        }
      });

      // 🚀 OPTIMIZATION: Use transaction for atomic TeamRequest creation
      await db.runTransaction(async (transaction) => {
        const validEmails: string[] = [];
        const requestCreationPromises: Promise<void>[] = [];

        // Process each email
        for (const email of normalizedEmails) {
          const userData = emailToUserMap.get(email);

          if (!userData) {
            console.warn(`User with email ${email} not found, skipping invitation`);
            continue;
          }

          validEmails.push(email);
          const requestId = uuidv4();
          requestIds.push(requestId);

          const teamRequestData = {
            requestId: requestId,
            from: creatorId,
            fromName: leaderData.fullName || leaderData.name || 'Team Leader',
            to: email,
            status: "pending",
            eventId: eventId,
            eventName: eventDetails.name || 'Event',
            teamId: teamId,
            teamName: teamName,
            message: message || `Welcome to ${teamName}! You've been invited to join our team.`,
            createdAt: firestore.FieldValue.serverTimestamp(),
          };

          // 🚀 OPTIMIZATION: Add to transaction instead of individual writes
          const requestRef = db.collection("TeamRequests").doc(requestId);
          transaction.set(requestRef, teamRequestData);
        }

        // 🚀 OPTIMIZATION: Send emails in parallel after transaction commits
        // This prevents email sending from blocking the transaction
        if (validEmails.length > 0) {
          // Transaction will auto-commit when function completes successfully
          
          // Send emails asynchronously using setImmediate
          setImmediate(() => {
            validEmails.forEach((email, index) => {
              const userData = emailToUserMap.get(email);
              const requestId = requestIds[index]; // Get corresponding request ID
              
              if (userData && requestId) {
                sendTeamRequestEmail(
                  userData.email,
                  userData.fullName || userData.name,
                  leaderData.fullName || leaderData.name,
                  teamName,
                  eventDetails.name,
                  requestId
                ).catch(console.error);
              }
            });
          });
        }
      });

    } catch (error) {
      console.error('Error in createTeamRequests:', error);
      throw new Error(`Failed to create team requests: ${(error as Error).message}`);
    }

    return requestIds;
  }

  /**
   * Updates team document with request IDs (Optimized)
   */
  static async updateTeamWithRequests(teamId: string, requestIds: string[]) {
    await db.collection("teams").doc(teamId).update({
      requestIds: requestIds,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }

  /**
   * Generates unique team ID
   */
  static generateTeamId(): string {
    return `team_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
}