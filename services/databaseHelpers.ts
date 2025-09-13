import { db } from "../firebase.ts";

export class DatabaseHelpers {
  /**
   * Validates user authentication and returns user_id
   */
  static validateAuth(req: any, res: any): string | null {
    if (!req.user_id) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    return req.user_id;
  }

  /**
   * Validates event ID parameter
   */
  static validateEventId(eventId: string | undefined, res: any): string | null {
    if (!eventId) {
      res.status(400).json({ message: "Missing event ID" });
      return null;
    }
    return eventId;
  }

  /**
   * Validates team ID parameter
   */
  static validateTeamId(teamId: string | undefined, res: any): string | null {
    if (!teamId) {
      res.status(400).json({ message: "Team ID required" });
      return null;
    }
    return teamId;
  }

  /**
   * Fetches user document and validates existence
   */
  static async getUserDocument(userId: string, res: any): Promise<any | null> {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        res.status(404).json({ message: "User not found" });
        return null;
      }
      return userDoc.data();
    } catch (error) {
      console.error("Error fetching user document:", error);
      res.status(500).json({ message: "Internal server error" });
      return null;
    }
  }

  /**
   * Fetches team document and validates existence
   */
  static async getTeamDocument(teamId: string, res: any): Promise<any | null> {
    try {
      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        res.status(404).json({ message: "Team not found" });
        return null;
      }
      return teamDoc.data();
    } catch (error) {
      console.error("Error fetching team document:", error);
      res.status(500).json({ message: "Internal server error" });
      return null;
    }
  }

  /**
   * Validates request parameters for team request response
   */
  static validateRequestParams(requestId: string | undefined, status: any, res: any): { requestId: string, status: string } | null {
    if (!requestId || !status) {
      res.status(400).json({ message: "Request ID and status required" });
      return null;
    }

    // Validate status values (case-insensitive)
    if (!["accepted", "declined", "ACCEPTED", "DECLINED"].includes(status)) {
      res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'declined'" });
      return null;
    }

    return { requestId, status: status.toLowerCase() };
  }

  /**
   * Helper to fetch event details
   */
  static async getEventDetails(eventId: string) {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) throw new Error("Event not found");
    const eventData = eventSnap.data();
    return {
      name: eventData?.Title ?? "Event",
      date: eventData?.DateTime?.toDate?.() ?? new Date(),
      location: eventData?.Location ?? "N/A",
    };
  }
}