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
//
// Renvoie false plutot que de propager : un SMTP injoignable ne doit pas faire
// echouer l'appelant, mais celui-ci doit pouvoir en tenir compte (proposer un
// renvoi, journaliser) au lieu de croire le mail parti.
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
