export interface Team {
  teamName: string;
  leader: string;
  members: string[];
  requests: string[];
  eventId: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: Date;
}
