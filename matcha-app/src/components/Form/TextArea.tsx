"use client";

import { useState } from "react";
import { Alert } from "@/components/Form/Alert";

type TextAreaProps = {
	id: string;
	label: string;
	name?: string;
	rows?: number;
	maxLength: number;
	placeholder?: string;
	defaultValue?: string;
	error?: string;
};

export function TextArea({
	id,
	label,
	name,
	rows = 5,
	maxLength,
	placeholder,
	defaultValue = "",
	error,
}: TextAreaProps) {
	const [length, setLength] = useState(defaultValue.length);
	const errorId = error ? `${id}-error` : undefined;

	return (
		<div>
			<div className="flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				<span className="text-xs text-muted">
					{length} / {maxLength}
				</span>
			</div>

			<textarea
				id={id}
				name={name ?? id}
				rows={rows}
				required
				maxLength={maxLength}
				placeholder={placeholder}
				defaultValue={defaultValue}
				onInput={(event) => setLength(event.currentTarget.value.length)}
				aria-invalid={error ? true : undefined}
				aria-describedby={errorId}
				className="mt-2 w-full resize-none rounded-xl border border-edge bg-white/70 px-4 py-3 text-base transition-colors duration-200 ease-out aria-invalid:border-red-700 aria-invalid:bg-red-50/60 focus-visible:border-matcha"
			/>

			{error ? (
				<Alert id={errorId} className="mt-2">
					{error}
				</Alert>
			) : null}
		</div>
	);
}
