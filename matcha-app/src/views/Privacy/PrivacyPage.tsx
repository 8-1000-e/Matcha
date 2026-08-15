import { BrandLockup } from "@/components/Brand/Brand";
import { BackLink } from "@/components/Form/Button";
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
		<Screen
			width="wide"
			top={
				<div className="flex w-full items-center justify-between gap-3">
					<BrandLockup />
					<BackLink href="/me" label="Mon profil" />
				</div>
			}
			footer={<Footer />}
		>
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
