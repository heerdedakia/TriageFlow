import { describe, it, expect, vi } from 'vitest';
import { TRANSITIONS, type TransitionCtx } from '../app/actions/issues';
import { IssueStatus, Role } from '@prisma/client';

describe('Workflow Permissions (TRANSITIONS)', () => {
  it('allows QA to move NEW to TRIAGED', () => {
    const ctx: TransitionCtx = { sessionRole: Role.QA, assigneeId: null, reporterId: 'user1', sessionId: 'user2' };
    const rule = TRANSITIONS[IssueStatus.NEW]?.[IssueStatus.TRIAGED];
    expect(rule).toBeDefined();
    expect(rule!(ctx)).toBe(true);
  });

  it('prevents DEVELOPER from moving NEW to TRIAGED', () => {
    const ctx: TransitionCtx = { sessionRole: Role.DEVELOPER, assigneeId: null, reporterId: 'user1', sessionId: 'user2' };
    const rule = TRANSITIONS[IssueStatus.NEW]?.[IssueStatus.TRIAGED];
    expect(rule!(ctx)).toBe(false);
  });

  it('allows assignee (DEVELOPER) to move ASSIGNED to IN_PROGRESS', () => {
    const ctx: TransitionCtx = { sessionRole: Role.DEVELOPER, assigneeId: 'dev1', reporterId: 'user1', sessionId: 'dev1' };
    const rule = TRANSITIONS[IssueStatus.ASSIGNED]?.[IssueStatus.IN_PROGRESS];
    expect(rule!(ctx)).toBe(true);
  });

  it('prevents non-assignee DEVELOPER from moving ASSIGNED to IN_PROGRESS', () => {
    const ctx: TransitionCtx = { sessionRole: Role.DEVELOPER, assigneeId: 'dev1', reporterId: 'user1', sessionId: 'dev2' };
    const rule = TRANSITIONS[IssueStatus.ASSIGNED]?.[IssueStatus.IN_PROGRESS];
    expect(rule!(ctx)).toBe(false);
  });

  it('allows reporter to move RESOLVED to NEW', () => {
    const ctx: TransitionCtx = { sessionRole: Role.DEVELOPER, assigneeId: 'dev1', reporterId: 'reporter1', sessionId: 'reporter1' };
    const rule = TRANSITIONS[IssueStatus.RESOLVED]?.[IssueStatus.NEW];
    expect(rule!(ctx)).toBe(true);
  });
});

import { db } from '@/lib/db';
import { createIssue, type CreateIssueData } from '@/app/actions/issues';
import * as auth from '@/lib/auth';

// Mock getSession so it passes
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    getSession: vi.fn().mockResolvedValue({ id: 'user1', role: 'ADMIN' })
  };
});

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Concurrent createIssue', () => {
  it('retries on unique constraint failure', async () => {
    // We mock Prisma so we don't need real DB for this specific logic
    const dbMock = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'proj1', key: 'TEST', _count: { issues: 10 } }),
        findUnique: vi.fn().mockResolvedValue({ id: 'proj1', key: 'TEST', _count: { issues: 10 } })
      },
      issue: {
        count: vi.fn().mockResolvedValue(10)
      },
      $transaction: vi.fn()
    };
    
    // Override the real db object methods for this test
    vi.spyOn(db.project, 'findUnique').mockImplementation(dbMock.project.findUnique);
    vi.spyOn(db.project, 'findFirst').mockImplementation(dbMock.project.findFirst);
    vi.spyOn(db.issue, 'count').mockImplementation(dbMock.issue.count);
    
    // Make the first transaction fail with Prisma P2002, second one succeed
    const txMock = vi.spyOn(db, '$transaction');
    txMock.mockRejectedValueOnce({ code: 'P2002' })
          .mockResolvedValueOnce({ id: 'new-issue', key: 'TEST-12' });

    const data: CreateIssueData = {
      projectName: 'TEST',
      title: 'Concurrent issue',
      description: 'this is a long enough description',
      severity: 'LOW',
      priority: 'LOW',
    };

    const result = await createIssue(data);
    console.log(result);

    expect(result.success).toBe(true);
    expect(result.issueKey).toBe('TEST-12');
    expect(txMock).toHaveBeenCalledTimes(2); // Retried!
  });
});
