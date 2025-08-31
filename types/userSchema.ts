export interface User {
  userId: string;                
  email: string;                  
  name: string;                   
  registrations: string[];        
  createdAt: FirebaseFirestore.Timestamp; 
}
