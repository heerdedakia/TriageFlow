import { Severity } from '@prisma/client';

export const SLA_DURATIONS: Record<Severity, number> = {
  [Severity.CRITICAL]: 4 * 60 * 60 * 1000,        // 4 hours
  [Severity.HIGH]: 24 * 60 * 60 * 1000,          // 24 hours
  [Severity.MEDIUM]: 3 * 24 * 60 * 60 * 1000,     // 3 days
  [Severity.LOW]: 7 * 24 * 60 * 60 * 1000,        // 7 days
};

/**
 * Compute the SLA deadline date based on severity and creation time.
 */
export function computeSlaDeadline(severity: Severity, createdAt: Date): Date {
  const duration = SLA_DURATIONS[severity] || SLA_DURATIONS[Severity.MEDIUM];
  return new Date(createdAt.getTime() + duration);
}

/**
 * Determine the SLA status: ok, at-risk, or breached.
 * at-risk is defined as within 25% of the deadline remaining.
 */
export function getSlaStatus(
  severity: Severity,
  createdAt: Date,
  now: Date = new Date()
): 'ok' | 'at-risk' | 'breached' {
  const deadline = computeSlaDeadline(severity, createdAt);
  const totalDuration = SLA_DURATIONS[severity] || SLA_DURATIONS[Severity.MEDIUM];
  const remaining = deadline.getTime() - now.getTime();

  if (remaining <= 0) {
    return 'breached';
  }

  // If remaining time is less than or equal to 25% of the total SLA window
  if (remaining <= totalDuration * 0.25) {
    return 'at-risk';
  }

  return 'ok';
}
