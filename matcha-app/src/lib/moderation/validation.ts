import { REPORT_REASONS, type ReportReason } from "@/lib/db";
import { isRecord, type Validated } from "@/lib/profile/validation";

export function validateReportReason(body: unknown): Validated<ReportReason>
{
	if (!isRecord(body))
	{
		return { ok: false, errors: ["invalid request body"] };
	}

	const reason = body.reason;
	if (
		typeof reason !== "string"
		|| !(REPORT_REASONS as readonly string[]).includes(reason)
	)
	{
		return { ok: false, errors: ["reason is invalid"] };
	}

	return { ok: true, value: reason as ReportReason };
}
