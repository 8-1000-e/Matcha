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

// `text` est optionnel mais fortement conseille : un mail sans version texte
// passe plus facilement pour du spam.
export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<void>
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
	}
	catch (error)
	{
		console.error("sendMail failed", error);
	}
}
