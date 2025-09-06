import { db } from "../firebase.ts";


export async function checkEventExists(eventId: string): Promise<boolean> {
    try {
        if (!eventId) {
            return false;
        }
        const docRef = db.collection('events').doc(eventId);
        const docsnap = await docRef.get();

        return docsnap.exists;

    } catch (error) {
        console.log("Error checking Value from event colllection : ", error);
        return false;
    }
}