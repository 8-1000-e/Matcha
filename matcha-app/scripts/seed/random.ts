export function pick<Value>(values: readonly Value[]): Value
{
	return values[Math.floor(Math.random() * values.length)];
}
