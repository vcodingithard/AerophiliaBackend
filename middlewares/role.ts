import type { Request, Response, NextFunction } from 'express';
import { db } from "../firebase.ts";

export const isTeamLeaderMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.uid;
  const teamId = req.params.id; 

  if (!userId) {
    return res.status(401).send({ error: 'Unauthorized: User not authenticated.' });
  }

  if (!teamId) {
    return res.status(400).send({ error: 'Bad Request: Team ID is missing.' });
  }

  try {
    const teamDocRef = db.collection('teams').doc(teamId);
    const teamDoc = await teamDocRef.get();

    if (!teamDoc.exists) {
      return res.status(404).send({ error: 'Not Found: Team not found.' });
    }

    const teamData = teamDoc.data();

    // Check if the authenticated user's ID matches the team's leader ID
    if (teamData?.leader !== userId) {
      return res.status(403).send({ error: 'Forbidden: Only the team leader can perform this action.' });
    }

    next(); // User is the team leader, proceed.
  } catch (error) {
    console.error('Error checking team leadership:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
};
