// Templates des e-mails transactionnels.
//
// Contraintes propres à l'e-mail : tableaux HTML (pas de flex ni de grid),
// styles inline uniquement (les <style> sont souvent retirés), 600px de large,
// aucune image distante (la plupart des clients les bloquent par défaut).

const CREAM = "#f4f8ee";
const LEAF = "#d7e8bf";
const MATCHA = "#4c7a2f";
const MATCHA_DARK = "#3a5f23";
const INK = "#26301c";
const MUTED = "#5a6552";
const EDGE = "#85907c";

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

// Le username vient de l'utilisateur : sans échappement, c'est une injection HTML.
export function escapeHtml(value: string): string
{
	return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

export type MailContent = {
	subject: string;
	html: string;
	text: string;
};

type Section = {
	preheader: string;
	title: string;
	intro: string;
	action: string;
	link: string;
	ttlMinutes: number;
	note?: string;
};

function button(label: string, link: string): string
{
	// Un bouton = une cellule de tableau : les <button> et les paddings sur <a>
	// ne survivent pas à Outlook.
	return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse:separate;">
			<tr>
				<td align="center" bgcolor="${MATCHA}" style="border-radius:999px;">
					<a href="${link}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:999px;background-color:${MATCHA};">${label}</a>
				</td>
			</tr>
		</table>`;
}

function layout(section: Section): string
{
	const link = escapeHtml(section.link);
	const expiry = `Ce lien expire dans ${section.ttlMinutes} minutes.`;
	const note = section.note
		? `<p style="margin:0 0 4px;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};">${section.note}</p>`
		: "";

	return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${section.title}</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${section.preheader}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${CREAM};">
	<tr>
		<td align="center" style="padding:32px 16px;">
			<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;">
				<tr>
					<td align="center" style="padding:0 0 20px;">
						<span style="font-family:${FONT};font-size:22px;line-height:28px;">&#127861;</span>
						<span style="font-family:${FONT};font-size:20px;font-weight:600;letter-spacing:-0.4px;color:${INK};vertical-align:middle;">&nbsp;Brew<span style="color:${MATCHA};">mance</span></span>
					</td>
				</tr>
				<tr>
					<td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${LEAF};border-radius:24px;padding:36px 32px;">
						<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:32px;font-weight:600;color:${INK};">${section.title}</h1>
						<p style="margin:0 0 24px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK};">${section.intro}</p>
						<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
							<tr>
								<td align="center" style="padding:0 0 24px;">${button(section.action, link)}</td>
							</tr>
						</table>
						<p style="margin:0 0 8px;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
						<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${CREAM};border-radius:16px;">
							<tr>
								<td style="padding:14px 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${MATCHA_DARK};word-break:break-all;">${link}</td>
							</tr>
						</table>
						<p style="margin:20px 0 4px;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};">${expiry}</p>
						${note}
					</td>
				</tr>
				<tr>
					<td align="center" style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:20px;color:${EDGE};">
						Brewmance &mdash; le thé qui rapproche.<br>
						Cet e-mail vous a été envoyé automatiquement, merci de ne pas y répondre.
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
</body>
</html>`;
}

function plain(section: Section, intro: string): string
{
	const lines = [
		"Brewmance",
		"",
		section.title,
		"",
		intro,
		"",
		`${section.action} : ${section.link}`,
		"",
		`Ce lien expire dans ${section.ttlMinutes} minutes.`,
	];

	if (section.note)
	{
		lines.push("", section.note);
	}

	lines.push("", "Cet e-mail vous a été envoyé automatiquement, merci de ne pas y répondre.");
	return lines.join("\n");
}

function minutes(ttlSeconds: number): number
{
	return Math.max(1, Math.round(ttlSeconds / 60));
}

type MailInput = {
	username: string;
	link: string;
	ttlSeconds: number;
};

export function verifyEmailMail({ username, link, ttlSeconds }: MailInput): MailContent
{
	const section: Section = {
		preheader: "Une dernière étape avant de rejoindre Brewmance.",
		title: "Confirmez votre adresse",
		intro: `Bienvenue ${escapeHtml(username)} ! Confirmez votre adresse e-mail pour activer votre compte Brewmance.`,
		action: "Confirmer mon adresse",
		link,
		ttlMinutes: minutes(ttlSeconds),
	};

	return {
		subject: "Confirmez votre adresse - Brewmance",
		html: layout(section),
		text: plain(section, `Bienvenue ${username} ! Confirmez votre adresse e-mail pour activer votre compte Brewmance.`),
	};
}

export function resendVerifyMail({ username, link, ttlSeconds }: MailInput): MailContent
{
	const section: Section = {
		preheader: "Voici un nouveau lien de confirmation.",
		title: "Votre nouveau lien de confirmation",
		intro: `Bonjour ${escapeHtml(username)}, voici un nouveau lien pour confirmer votre adresse e-mail. Les liens précédents ne sont plus valables.`,
		action: "Confirmer mon adresse",
		link,
		ttlMinutes: minutes(ttlSeconds),
	};

	return {
		subject: "Votre nouveau lien de confirmation - Brewmance",
		html: layout(section),
		text: plain(
			section,
			`Bonjour ${username}, voici un nouveau lien pour confirmer votre adresse e-mail. Les liens précédents ne sont plus valables.`,
		),
	};
}

export function resetPasswordMail({ username, link, ttlSeconds }: MailInput): MailContent
{
	const note = "Si vous n’avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.";
	const section: Section = {
		preheader: "Choisissez un nouveau mot de passe.",
		title: "Réinitialisez votre mot de passe",
		intro: `Bonjour ${escapeHtml(username)}, vous avez demandé à changer le mot de passe de votre compte Brewmance.`,
		action: "Choisir un nouveau mot de passe",
		link,
		ttlMinutes: minutes(ttlSeconds),
		note,
	};

	return {
		subject: "Réinitialisez votre mot de passe - Brewmance",
		html: layout(section),
		text: plain(
			section,
			`Bonjour ${username}, vous avez demandé à changer le mot de passe de votre compte Brewmance.`,
		),
	};
}
