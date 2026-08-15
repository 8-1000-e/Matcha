import { BrandLockup } from "@/components/Brand/Brand";
import { Footer } from "@/components/Layout/Footer";
import { Screen } from "@/components/Layout/Screen";

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-base font-semibold tracking-tight">{title}</h2>
			{children}
		</section>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid gap-1 py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
			<dt className="text-sm font-medium">{label}</dt>
			<dd className="text-sm text-muted">{value}</dd>
		</div>
	);
}

export function PrivacyPage() {
	return (
		<Screen width="wide" top={<BrandLockup />} footer={<Footer />}>
			<div className="flex flex-col gap-10">
				<header className="flex flex-col gap-3">
					<h1 className="text-2xl font-semibold tracking-tight">
						Vos données personnelles
					</h1>
					<p className="text-sm text-muted">
						Cette page décrit ce que Brewmance collecte, pourquoi, combien de
						temps, et ce que vous pouvez exiger. Elle est écrite pour être lue,
						pas pour être acceptée sans être lue.
					</p>
					<p className="rounded-xl bg-leaf/30 px-4 py-3 text-sm">
						<strong>Brewmance est un projet d’école</strong>, réalisé dans le
						cadre du cursus 42. Ce n’est pas un service commercial et il n’a
						aucun utilisateur réel. N’y saisissez aucune donnée que vous ne
						voudriez pas voir dans un devoir corrigé par un autre étudiant.
					</p>
				</header>

				<Section title="Ce que nous collectons">
					<dl className="divide-y divide-edge/20">
						<Row
							label="Identité"
							value="Adresse e-mail, nom d’utilisateur, nom, prénom, date de naissance. Fournis à l’inscription, obligatoires pour créer un compte."
						/>
						<Row
							label="Profil"
							value="Genre, orientation sexuelle, biographie, centres d’intérêt, jusqu’à cinq photos. Fournis par vous, modifiables à tout moment."
						/>
						<Row
							label="Localisation"
							value="Ville, quartier et coordonnées GPS. Le relevé automatique n’a lieu que si vous y consentez explicitement ; sinon vous saisissez votre ville à la main."
						/>
						<Row
							label="Activité"
							value="Likes donnés et reçus, profils consultés, connexions, messages, avis, blocages, signalements, notifications."
						/>
						<Row
							label="Technique"
							value="Empreinte du mot de passe, empreintes des jetons de session, date de dernière activité."
						/>
					</dl>
					<p className="text-sm text-muted">
						Aucun cookie publicitaire, aucun traceur tiers, aucune revente. Les
						seuls cookies déposés servent à vous garder connecté.
					</p>
				</Section>

				<Section title="Pourquoi, et sur quelle base">
					<dl className="divide-y divide-edge/20">
						<Row
							label="Faire fonctionner le service"
							value="Suggérer des profils, permettre les likes, les connexions et la messagerie. Base légale : l’exécution du contrat qui nous lie dès votre inscription."
						/>
						<Row
							label="Vous localiser"
							value="Classer les suggestions par proximité, comme le service l’exige. Base légale : votre consentement, révocable à tout moment dans les réglages."
						/>
						<Row
							label="Sécuriser les comptes"
							value="Vérification de l’adresse e-mail, sessions, renouvellement des jetons. Base légale : notre intérêt légitime à empêcher les usurpations."
						/>
						<Row
							label="Modérer"
							value="Traiter les signalements et faire respecter les blocages. Base légale : notre intérêt légitime à protéger les personnes."
						/>
					</dl>
				</Section>

				<Section title="Combien de temps">
					<dl className="divide-y divide-edge/20">
						<Row
							label="Votre compte"
							value="Tant qu’il existe. Sa suppression le rend invisible immédiatement ; les données sont conservées quatorze jours pour vous laisser revenir en arrière, puis effacées."
						/>
						<Row
							label="Après ces quatorze jours"
							value="Tout part : profil, photos et fichiers image, likes, visites, connexions, messages, avis, blocages, signalements, notifications. Rien n’est archivé, rien n’est anonymisé et conservé."
						/>
						<Row
							label="Jetons de session"
							value="Les jetons d’accès expirent après quinze minutes, les jetons de renouvellement après trente jours. Les jetons expirés sont purgés automatiquement."
						/>
						<Row
							label="Sessions de recherche"
							value="L’ordre figé de votre fil de suggestions est conservé trente minutes, puis supprimé."
						/>
					</dl>
				</Section>

				<Section title="Comment vos données sont protégées">
					<ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
						<li>
							Les mots de passe ne sont <strong>jamais</strong> stockés : seule
							une empreinte bcrypt est conservée, et elle n’est pas réversible.
						</li>
						<li>
							Le contenu des messages est <strong>chiffré en base</strong> en
							AES-256-GCM. Voler le fichier de base de données ne suffit pas à
							les lire.
						</li>
						<li>
							Les cookies de session sont <code>httpOnly</code> : le JavaScript
							de la page ne peut pas les lire.
						</li>
						<li>
							Vos coordonnées GPS exactes et votre date de naissance ne sont
							jamais envoyées aux autres utilisateurs. Ils ne voient que votre
							ville, votre quartier, une distance et votre âge.
						</li>
						<li>
							Votre adresse e-mail n’est visible que par vous.
						</li>
					</ul>
				</Section>

				<Section title="Qui d’autre voit vos données">
					<dl className="divide-y divide-edge/20">
						<Row
							label="Les autres utilisateurs"
							value="Votre profil public : prénom, nom, âge, genre, orientation, biographie, centres d’intérêt, photos, ville, quartier, note et date de dernière connexion."
						/>
						<Row
							label="Pusher"
							value="Prestataire du temps réel. Transitent par lui les messages de discussion et les notifications, le temps de leur acheminement."
						/>
						<Row
							label="Serveur d’envoi d’e-mails"
							value="Votre adresse e-mail, pour les liens de vérification et de réinitialisation."
						/>
						<Row
							label="Photon (Komoot)"
							value="Service de géocodage interrogé lorsque vous cherchez une ville. Il reçoit le texte que vous saisissez, jamais votre identité."
						/>
					</dl>
					<p className="text-sm text-muted">
						Aucune donnée n’est vendue, louée, ni transmise à des annonceurs.
					</p>
				</Section>

				<Section title="Vos droits">
					<dl className="divide-y divide-edge/20">
						<Row
							label="Rectification"
							value="Toutes vos informations sont modifiables depuis votre profil et vos réglages, sans avoir à demander quoi que ce soit."
						/>
						<Row
							label="Effacement"
							value="« Supprimer mon compte », dans les réglages. Effet immédiat, effacement définitif au quatorzième jour."
						/>
						<Row
							label="Retrait du consentement"
							value="Le suivi de position se désactive dans les réglages. Votre dernière ville connue reste utilisée, elle ne change plus toute seule."
						/>
						<Row
							label="Opposition et limitation"
							value="Bloquer un profil suffit à faire cesser tout traitement vous concernant de sa part : il ne vous voit plus, ne vous écrit plus et ne vous notifie plus."
						/>
						<Row
							label="Accès et portabilité"
							value="L’export de vos données dans un format lisible par une machine n’est pas encore disponible. Il est prévu, et le chiffrement des messages a été conçu réversible exactement pour cela."
						/>
					</dl>
				</Section>

				<Section title="Contact">
					<p className="text-sm text-muted">
						Brewmance étant un projet d’école sans exploitant, il n’existe ni
						délégué à la protection des données ni adresse de contact. Pour
						toute question, adressez-vous à l’étudiant qui vous a présenté ce
						projet.
					</p>
				</Section>
			</div>
		</Screen>
	);
}
