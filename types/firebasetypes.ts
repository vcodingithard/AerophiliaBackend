


export const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];


export const RequestStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export interface User{
    id:string;
    password:string;// for the nomral email + password
    email:string;
    fullName:string;
    age?:number;
    college?:string;
    year_of_study?:number;
    role?:string;
    team_id:string;
    events_registered:string[];
    paid:boolean;
    createdAt:Date;
    updatedAt:Date
    
}

export interface Profile {
  user_id: string; // Foreign key 
  username: string;
  email: string;
  college_name: string;
  events_registered: string[]; // Array of event IDs (string)
  DOB: Date;// idk why you gave long..so i assined it as Date
  Bio?: string;
  Social_Links?: string[];
}


export interface Event {
  event_id: string;
  Title: string;
  description: string;
  Location: string;// in er diagram there was 2 Location hence i added only 1 Location 
  Volunteer_Name: string[];
  volunteer_phone_no: string[];
  Payment_Amount: number;
  participant_count: number;
  DateTime: Date;
  createdAt: Date;
  eventType : String;
}

export interface Team {
  team_id: string;
  team_name: string;
  team_leader: string;
  member_ids: string[]; 
  college_name: string;
  member_count: number;
  payment_ids: string[]; 
  events_ids: string[];
  createdAt: Date;
}

export interface Payment {
  payment_id: string;
  user_id: string; 
  event_id: string; 
  amount: number;
  payment_method: string;
  receipt_url: string;
  any_notes: string;
  status: PaymentStatus;
  time: Date;
}

export interface Request {
  request_id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  receiver_name: string;
  sender_email: string;
  receiver_email: string;
  message_title: string;
  message_body: string;
  status: RequestStatus;
  requested_time: Date;
  request_url?: string;
}

export interface Registration {
  registration_id: string;   
  event_id: string;          
  registrant_id: string;     
  team_event: boolean,       
  team_id: string | null;   
  payment_id: string | null;
  status: "completed" | "incomplete"; 
  createdAt: Date;       
}
