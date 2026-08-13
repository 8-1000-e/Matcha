import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASS,
	},
});
export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean>
{
	try
	{
		await transporter.sendMail({
			from: process.env.SMTP_FROM,
			to,
			subject,
			html,
			text,
		});
		return true;
	}
	catch (error)
	{
		console.error("sendMail failed", error);
		return false;
	}
}