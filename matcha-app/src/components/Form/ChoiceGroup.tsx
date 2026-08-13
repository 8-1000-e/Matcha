type Choice = {
	value: string;
	label: string;
};

type ChoiceGroupProps = {
	legend: string;
	name: string;
	options: readonly Choice[];
	defaultValue?: string | null;
	hint?: string;
};

export function ChoiceGroup({
	legend,
	name,
	options,
	defaultValue,
	hint,
}: ChoiceGroupProps) {
	return (
		<fieldset>
			<legend className="text-sm font-medium">{legend}</legend>
			{hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}

			<div className="mt-3 flex flex-wrap gap-2">
				{options.map((option) => (
					<label
						key={option.value}
						className="cursor-pointer rounded-xl border border-edge bg-white/70 px-4 py-2.5 text-sm transition-colors duration-200 ease-out has-checked:border-matcha has-checked:bg-leaf/70 has-checked:font-medium hover:bg-leaf/40"
					>
						<input
							type="radio"
							name={name}
							value={option.value}
							defaultChecked={option.value === defaultValue}
							required
							className="sr-only"
						/>
						{option.label}
					</label>
				))}
			</div>
		</fieldset>
	);
}
