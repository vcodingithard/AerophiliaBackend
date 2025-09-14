import { db, firestore } from "../firebase.ts";

export class TeamOperationsService {
  /**
   * Checks if team has completed payment (prevents leaving)
   */
  static async checkPaymentStatus(teamId: string) {
    const registrationsSnap = await db.collection("registrations")
      .where("teamId", "==", teamId)
      .where("payment_id", "!=", null)
      .get();

    if (!registrationsSnap.empty) {
      throw new Error("Cannot leave team after payment has been completed");
    }
  }

  /**
   * Disbands entire team (leader leaving)
   */
  static async disbandTeam(teamId: string, teamData: any) {
    const allMembers = teamData.members || [];
    const eventId = teamData.eventId;
    const teamRef = db.collection("teams").doc(teamId);

    await db.runTransaction(async (tx) => {
      // Delete team
      tx.delete(teamRef);

      // Reset all members' eventsRegistered
      for (const memberId of allMembers) {
        tx.update(db.collection("users").doc(memberId), {
          eventsRegistered: firestore.FieldValue.arrayRemove(eventId),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // Delete all registrations for this team
      const registrationsSnap = await db.collection("registrations")
        .where("teamId", "==", teamId)
        .get();

      for (const regDoc of registrationsSnap.docs) {
        tx.delete(regDoc.ref);
      }

      // Update team requests to cancelled
      const requestsSnap = await db.collection("TeamRequests")
        .where("teamId", "==", teamId)
        .get();

      for (const reqDoc of requestsSnap.docs) {
        tx.update(reqDoc.ref, {
          status: "cancelled",
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    });
  }

  /**
   * Removes member from team (member leaving)
   */
  static async removeMemberFromTeam(teamId: string, userId: string, eventId: string) {
    const teamRef = db.collection("teams").doc(teamId);

    await db.runTransaction(async (tx) => {
      // Remove user from team members
      tx.update(teamRef, {
        members: firestore.FieldValue.arrayRemove(userId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Reset user's eventsRegistered
      tx.update(db.collection("users").doc(userId), {
        eventsRegistered: firestore.FieldValue.arrayRemove(eventId),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Delete user's registration for this team
      const userRegistrationSnap = await db.collection("registrations")
        .where("teamId", "==", teamId)
        .where("registrant_id", "==", userId)
        .get();

      for (const regDoc of userRegistrationSnap.docs) {
        tx.delete(regDoc.ref);
      }
    });
  }

  /**
   * Validates user's membership in team
   */
  static validateTeamMembership(teamData: any, userId: string) {
    const isLeader = teamData.leader === userId;
    const isMember = teamData.members?.includes(userId);

    if (!isLeader && !isMember) {
      throw new Error("You are not part of this team");
    }

    return { isLeader, isMember };
  }
}