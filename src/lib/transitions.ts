import { Role, IssueStatus } from '@prisma/client';

export type TransitionCtx = { sessionRole: Role; assigneeId: string | null; reporterId: string; sessionId: string };

const checkRole = (role: Role, allowed: Role[]) => allowed.includes(role);

export const TRANSITIONS: Record<IssueStatus, Partial<Record<IssueStatus, (ctx: TransitionCtx) => boolean>>> = {
  NEW: {
    TRIAGED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER, Role.QA]),
    ASSIGNED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER, Role.QA]),
    CLOSED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]), // reject/won't-fix path
  },
  TRIAGED: {
    ASSIGNED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER, Role.QA]),
    NEW: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER, Role.QA]),
    CLOSED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
  },
  ASSIGNED: {
    TRIAGED: (ctx) => checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER, Role.QA]),
    IN_PROGRESS: (ctx) => ctx.assigneeId === ctx.sessionId || checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
  },
  IN_PROGRESS: {
    ASSIGNED: (ctx) => ctx.assigneeId === ctx.sessionId || checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
    RESOLVED: (ctx) => ctx.assigneeId === ctx.sessionId || checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
    VERIFICATION: (ctx) => ctx.assigneeId === ctx.sessionId || checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
  },
  RESOLVED: {
    VERIFICATION: (ctx) => ctx.assigneeId === ctx.sessionId || checkRole(ctx.sessionRole, [Role.ADMIN, Role.PROJECT_MANAGER]),
    IN_PROGRESS: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
    NEW: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
  },
  VERIFICATION: {
    CLOSED: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
    IN_PROGRESS: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
    NEW: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
  },
  CLOSED: {
    IN_PROGRESS: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
    NEW: (ctx) => checkRole(ctx.sessionRole, [Role.QA, Role.ADMIN, Role.PROJECT_MANAGER]) || ctx.reporterId === ctx.sessionId,
  },
};
