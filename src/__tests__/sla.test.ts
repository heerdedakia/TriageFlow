import { describe, it, expect } from 'vitest';
import { Severity, Role, IssueStatus } from '@prisma/client';
import { computeSlaDeadline, getSlaStatus } from '@/lib/sla';
import { TRANSITIONS, type TransitionCtx } from '@/lib/transitions';

describe('SLA Deadline Calculations', () => {
  it('correctly calculates deadlines based on severity', () => {
    const start = new Date('2026-08-29T10:00:00Z');
    
    // Critical: 4 hours
    const criticalDeadline = computeSlaDeadline(Severity.CRITICAL, start);
    expect(criticalDeadline.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000);
    
    // High: 24 hours
    const highDeadline = computeSlaDeadline(Severity.HIGH, start);
    expect(highDeadline.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    
    // Medium: 3 days
    const mediumDeadline = computeSlaDeadline(Severity.MEDIUM, start);
    expect(mediumDeadline.getTime() - start.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
    
    // Low: 7 days
    const lowDeadline = computeSlaDeadline(Severity.LOW, start);
    expect(lowDeadline.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('SLA Status Categorization', () => {
  it('identifies breached issues', () => {
    const start = new Date('2026-08-29T10:00:00Z');
    // For critical (4 hours), 5 hours later is breached
    const later = new Date('2026-08-29T15:00:00Z');
    const status = getSlaStatus(Severity.CRITICAL, start, later);
    expect(status).toBe('breached');
  });

  it('identifies at-risk issues (within remaining 25% of window)', () => {
    const start = new Date('2026-08-29T10:00:00Z');
    // For critical (4 hours = 240 mins), remaining 25% starts at 3 hours elapsed (remaining <= 60 mins)
    // 3 hours and 30 mins elapsed (remaining = 30 mins <= 60 mins) -> at-risk
    const atRiskTime = new Date('2026-08-29T13:30:00Z');
    const status = getSlaStatus(Severity.CRITICAL, start, atRiskTime);
    expect(status).toBe('at-risk');
  });

  it('identifies on-track (ok) issues', () => {
    const start = new Date('2026-08-29T10:00:00Z');
    // 1 hour elapsed (remaining = 3 hours > 1 hour) -> ok
    const okTime = new Date('2026-08-29T11:00:00Z');
    const status = getSlaStatus(Severity.CRITICAL, start, okTime);
    expect(status).toBe('ok');
  });
});

describe('SLA Transition Constraints', () => {
  it('blocks direct closing of overdue CRITICAL issues from NEW status', () => {
    // 5 hours elapsed on critical -> breached
    const start = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const ctx: TransitionCtx = {
      sessionRole: Role.ADMIN,
      assigneeId: null,
      reporterId: 'user1',
      sessionId: 'user1',
      severity: Severity.CRITICAL,
      createdAt: start,
    };
    
    const rule = TRANSITIONS[IssueStatus.NEW]?.[IssueStatus.CLOSED];
    expect(rule).toBeDefined();
    expect(rule!(ctx)).toBe(false); // Blocks closure!
  });

  it('allows closing of overdue CRITICAL issues from VERIFICATION status', () => {
    const start = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const ctx: TransitionCtx = {
      sessionRole: Role.QA,
      assigneeId: null,
      reporterId: 'user1',
      sessionId: 'user1',
      severity: Severity.CRITICAL,
      createdAt: start,
    };
    
    const rule = TRANSITIONS[IssueStatus.VERIFICATION]?.[IssueStatus.CLOSED];
    expect(rule).toBeDefined();
    expect(rule!(ctx)).toBe(true); // Allows closure because it is in verification
  });

  it('allows direct closing of non-overdue CRITICAL issues from NEW status', () => {
    // Only 1 hour elapsed -> ok
    const start = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const ctx: TransitionCtx = {
      sessionRole: Role.ADMIN,
      assigneeId: null,
      reporterId: 'user1',
      sessionId: 'user1',
      severity: Severity.CRITICAL,
      createdAt: start,
    };
    
    const rule = TRANSITIONS[IssueStatus.NEW]?.[IssueStatus.CLOSED];
    expect(rule).toBeDefined();
    expect(rule!(ctx)).toBe(true); // Allows closure because it's not overdue
  });
});
