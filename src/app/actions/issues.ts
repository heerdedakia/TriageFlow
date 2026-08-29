'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role, IssueStatus, Severity, Priority } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const createIssueSchema = z.object({
  title: z.string().min(5, 'Summary must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  stepsToReproduce: z.string().optional().nullable(),
  expectedBehavior: z.string().optional().nullable(),
  actualBehavior: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  severity: z.nativeEnum(Severity),
  priority: z.nativeEnum(Priority),
  projectName: z.string().min(2, 'Product/Project name must be at least 2 characters'),
  urlOccurred: z.string().optional().nullable(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentMimeType: z.string().optional(),
  attachmentSize: z.number().optional(),
});

export type CreateIssueData = z.infer<typeof createIssueSchema>;

export async function createIssue(data: CreateIssueData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const result = createIssueSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    // Dynamic find or create project by name (case-insensitive to prevent duplicate/typo'd projects)
    let project = await db.project.findFirst({
      where: { name: { equals: result.data.projectName, mode: 'insensitive' } },
      include: { _count: { select: { issues: true } } },
    });

    if (!project) {
      let projectKey = result.data.projectName
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();
      if (projectKey.length < 2) projectKey = 'PRJ';
      
      let finalKey = projectKey;
      let counter = 1;
      while (true) {
        const exists = await db.project.findUnique({ where: { key: finalKey } });
        if (!exists) break;
        counter++;
        finalKey = `${projectKey}${counter}`;
      }

      // Query for an administrative account to be the project lead if user is not PM/Admin
      // Regression/Fix: Added orderBy createdAt: 'asc' for deterministic ordering. 
      // Relying on nondeterministic default ordering can cause race conditions or flaky tests
      // as the 'first' admin may vary across DB reads.
      const leadId = (session.role === Role.ADMIN || session.role === Role.PROJECT_MANAGER)
        ? session.id
        : (await db.user.findFirst({ 
            where: { role: Role.ADMIN },
            orderBy: { createdAt: 'asc' }
          }))?.id || session.id;

      project = await db.project.create({
        data: {
          name: result.data.projectName,
          key: finalKey,
          description: `Automatically created for product: ${result.data.projectName}`,
          leadId,
        },
        include: { _count: { select: { issues: true } } },
      });
    }

    // Generate unique key like DTR-101 based on issues count
    // Regression/Fix: To avoid race conditions on `Issue.key` unique constraint when multiple users 
    // create issues concurrently in the same project, we wrap the transaction in a retry loop.
    const MAX_RETRIES = 5;
    let newIssue = null;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // Fetch fresh count per attempt
        const currentProject = await db.project.findUnique({
          where: { id: project.id },
          include: { _count: { select: { issues: true } } },
        });
        const issueCount = currentProject?._count.issues || 0;
        const issueKey = `${project.key}-${101 + issueCount + attempt}`;

        newIssue = await db.$transaction(async (tx) => {
          // 1. Create Issue
          const issue = await tx.issue.create({
            data: {
              key: issueKey,
              title: result.data.title,
              description: result.data.description,
              stepsToReproduce: result.data.stepsToReproduce,
              expectedBehavior: result.data.expectedBehavior,
              actualBehavior: result.data.actualBehavior,
              environment: result.data.environment,
              severity: result.data.severity,
              priority: result.data.priority,
              status: IssueStatus.NEW,
              projectId: project.id,
              urlOccurred: result.data.urlOccurred || null,
              reporterId: session.id,
            },
          });

          // 2. Create Attachment if uploaded
          if (result.data.attachmentUrl && result.data.attachmentName) {
            await tx.attachment.create({
              data: {
                issueId: issue.id,
                name: result.data.attachmentName,
                url: result.data.attachmentUrl,
                mimeType: result.data.attachmentMimeType || 'application/octet-stream',
                size: result.data.attachmentSize || 0,
                uploadedById: session.id,
              },
            });
          }

          // 3. Log Activity
          await tx.activity.create({
            data: {
              issueId: issue.id,
              actorId: session.id,
              action: 'CREATE',
              details: JSON.stringify({ summary: result.data.title }),
            },
          });

          // 4. Create Notifications for Project Lead and Admins
          const leadId = project.leadId;
          if (leadId && leadId !== session.id) {
            await tx.notification.create({
              data: {
                userId: leadId,
                title: 'New Bug Reported',
                content: `New issue reported in ${project.key}: "${result.data.title}" (${issueKey})`,
                link: `/issues/${issueKey}`,
              },
            });
          }

          return issue;
        });

        break; // Success!
      } catch (error: any) {
        if (error.code === 'P2002' && attempt < MAX_RETRIES - 1) {
          attempt++;
          continue; // Retry on unique constraint violation
        }
        throw error; // Rethrow if it's not a unique constraint error or we're out of retries
      }
    }

    if (!newIssue) {
      throw new Error("Exceeded maximum retries for issue key generation.");
    }

    revalidatePath('/issues');
    revalidatePath('/dashboard');
    return { success: true, issueKey: newIssue.key };
  } catch (error) {
    console.error('Create issue error:', error);
    return { error: 'Failed to report issue. Please try again.' };
  }
}

export async function assignIssue(issueId: string, assigneeId: string | null) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // Permission check: Developer can self-assign, others (QA, PM, Admin) can assign to anyone
  const isSelfAssignment = assigneeId === session.id;
  const isAuthorized = 
    session.role === Role.ADMIN ||
    session.role === Role.PROJECT_MANAGER ||
    session.role === Role.QA ||
    (session.role === Role.DEVELOPER && isSelfAssignment);

  if (!isAuthorized) {
    return { error: 'Access Denied: You do not have permissions to assign this issue.' };
  }

  try {
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: { assignee: { select: { name: true } } },
    });

    if (!issue) {
      return { error: 'Issue not found' };
    }

    const oldAssigneeName = issue.assignee?.name || 'Unassigned';

    await db.$transaction(async (tx) => {
      // Update issue assignee
      await tx.issue.update({
        where: { id: issueId },
        data: { assigneeId },
      });

      // Log activity
      let newAssigneeName = 'Unassigned';
      if (assigneeId) {
        const newAssignee = await tx.user.findUnique({ where: { id: assigneeId } });
        newAssigneeName = newAssignee?.name || 'Unknown';
      }

      await tx.activity.create({
        data: {
          issueId,
          actorId: session.id,
          action: 'ASSIGNEE_CHANGE',
          details: JSON.stringify({ old: oldAssigneeName, new: newAssigneeName }),
        },
      });

      // Notify the new assignee
      if (assigneeId && assigneeId !== session.id) {
        await tx.notification.create({
          data: {
            userId: assigneeId,
            title: 'New Issue Assignment',
            content: `You have been assigned to: "${issue.title}" (${issue.key})`,
            link: `/issues/${issue.key}`,
          },
        });
      }
    });

    revalidatePath(`/issues/${issue.key}`);
    return { success: true };
  } catch (error) {
    console.error('Assign issue error:', error);
    return { error: 'Failed to assign issue' };
  }
}

import { TRANSITIONS, type TransitionCtx } from '@/lib/transitions';

export async function transitionIssueStatus(issueId: string, newStatus: IssueStatus) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: { reporter: true },
    });

    if (!issue) {
      return { error: 'Issue not found' };
    }

    const currentStatus = issue.status;

    // Check transitions using declarative table
    const transitionRule = TRANSITIONS[currentStatus]?.[newStatus];
    
    if (!transitionRule) {
      return { error: `Invalid transition: Cannot move issue from ${currentStatus} to ${newStatus}.` };
    }

    const isAllowed = transitionRule({
      sessionRole: session.role as Role,
      assigneeId: issue.assigneeId,
      reporterId: issue.reporterId,
      sessionId: session.id,
    });

    if (!isAllowed) {
      return { error: `Access Denied: Your role is not authorized to transition this issue from ${currentStatus} to ${newStatus}.` };
    }

    await db.$transaction(async (tx) => {
      // Update status
      await tx.issue.update({
        where: { id: issueId },
        data: {
          status: newStatus,
          closedAt: newStatus === IssueStatus.CLOSED ? new Date() : null,
        },
      });

      // Log Activity
      await tx.activity.create({
        data: {
          issueId,
          actorId: session.id,
          action: 'STATUS_CHANGE',
          details: JSON.stringify({ old: currentStatus, new: newStatus }),
        },
      });

      // Notify the reporter if QA/Admin changed status
      if (issue.reporterId !== session.id) {
        await tx.notification.create({
          data: {
            userId: issue.reporterId,
            title: 'Issue Status Updated',
            content: `Your reported issue "${issue.title}" (${issue.key}) status changed from ${currentStatus} to ${newStatus}`,
            link: `/issues/${issue.key}`,
          },
        });
      }
    });

    revalidatePath(`/issues/${issue.key}`);
    return { success: true };
  } catch (error) {
    console.error('Transition status error:', error);
    return { error: 'Failed to transition issue status' };
  }
}
