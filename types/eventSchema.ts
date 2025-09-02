export interface Event {
  eventId: string;
  name: string;
  type: string;
  minTeamSize: number;
  maxTeamSize: number;
  createdAt: FirebaseFirestore.Timestamp;
}
