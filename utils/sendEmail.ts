import nodemailer from "nodemailer";

export const sendEmail = async (reciverEmail: string, subject: string, emailBody: string) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS,
            },
        });

        const mailDetails = {
            from: `"Team Challengers" <${process.env.EMAIL_USER}>`,
            to: reciverEmail,
            subject: subject,
            content: emailBody,
        }

        const details = await transporter.sendEmail(mailDetails);
        return details;
    } catch (error) {
        console.log(`Error sending mail to ${reciverEmail} : ${error}`);
        throw error;
    }
}

