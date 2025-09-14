import { db, firestore } from "../firebase.ts";

export class TeamRequestService {
  /**
   * Validates team request response parameters
   */
  static validateRequestResponse(requestId: string | undefined, status: string | undefined) {
    if (!requestId) {
      throw new Error("Request ID is required");
    }

    if (!status || !['accepted', 'declined', 'rejected'].includes(status.toLowerCase())) {
      throw new Error("Valid status (accepted/declined/rejected) is required");
    }

    return status.toLowerCase();
  }

  /**
   * Gets and validates team request document
   */
  static async getTeamRequest(requestId: string, userEmail: string | undefined) {
    if (!userEmail) {
      throw new Error("User email is required");
    }

    const requestDoc = await db.collection("TeamRequests").doc(requestId).get();

    if (!requestDoc.exists) {
      throw new Error("Request not found");
    }

    const requestData = requestDoc.data();

    // Verify that this user is the recipient of the request
    if (requestData?.to !== userEmail) {
      throw new Error("You are not authorized to respond to this request");
    }

    // Check if request is already processed
    if (requestData?.status !== "pending") {
      throw new Error("Request has already been processed");
    }

    return { requestDoc, requestData };
  }

  /**
   * Handles team request acceptance
   */
  static async acceptTeamRequest(requestDoc: any, requestData: any, userId: string) {
    const teamId = requestData?.teamId;
    if (!teamId) {
      throw new Error("Invalid request: No team ID found");
    }

    const teamDoc = await db.collection("teams").doc(teamId).get();
    if (!teamDoc.exists) {
      throw new Error("Team not found");
    }

    const teamData = teamDoc.data();
    const currentMembers = teamData?.members || [];
    const minSize = teamData?.minSize || 2;
    const maxSize = teamData?.maxSize || 5;

    if (currentMembers.length >= maxSize) {
      throw new Error("Team is already full");
    }

    // Use transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // Update request status
      transaction.update(requestDoc.ref, {
        status: "accepted",
        acceptedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Add user to team members
      transaction.update(teamDoc.ref, {
        members: firestore.FieldValue.arrayUnion(userId),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      // Update registration status if team is now complete
      const registrationQuery = await db.collection("registrations")
        .where("teamId", "==", teamId)
        .limit(1)
        .get();

      if (!registrationQuery.empty) {
        const registrationDoc = registrationQuery.docs[0];
        if (registrationDoc && registrationDoc.exists) {
          const newMemberCount = currentMembers.length + 1;
          if (newMemberCount >= minSize) {
            transaction.update(registrationDoc.ref, {
              status: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
              memberCount: newMemberCount
            });
          } else {
            transaction.update(registrationDoc.ref, {
              memberCount: newMemberCount,
              updatedAt: firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }

      // Update user's teams array
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        transaction.update(userDoc.ref, {
          teams: firestore.FieldValue.arrayUnion(teamId),
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      }
    });

    // Get updated team data
    const updatedTeamDoc = await db.collection("teams").doc(teamId).get();
    const updatedTeamData = updatedTeamDoc.data();
    const finalMemberCount = updatedTeamData?.members?.length || 0;

    return {
      requestId: requestDoc.id,
      teamId: teamId,
      newMemberCount: finalMemberCount,
      registrationEnabled: finalMemberCount >= minSize,
      team: updatedTeamData
    };
  }

  /**
   * Handles team request rejection
   */
  static async rejectTeamRequest(requestDoc: any, userId: string) {
    await requestDoc.ref.update({
      status: "rejected",
      rejectedAt: firestore.FieldValue.serverTimestamp(),
      rejectedBy: userId
    });

    return {
      requestId: requestDoc.id,
      status: "rejected"
    };
  }
}