import { Alert } from "@/components/Form/Alert";
import type { AuthError, AuthField } from "@/lib/auth/errorMessages";
import type { Profile } from "@/lib/profile/client";

export type StepProps = {
	profile: Profile;
	onSaved: (profile: Profile) => void;
};

export function fieldError(errors: AuthError[], field: AuthField) {
	return errors.find((entry) => entry.field === field)?.message;
}

export function Errors({
	errors,
	only,
}: {
	errors: AuthError[];
	only?: AuthField[];
}) {
	const messages = errors
		.filter(
			(entry) =>
				entry.field === null || only === undefined || !only.includes(entry.field),
		)
		.map((entry) => entry.message);

	if (messages.length === 0) {
		return null;
	}

	return <Alert>{messages.join(" ")}</Alert>;
}
