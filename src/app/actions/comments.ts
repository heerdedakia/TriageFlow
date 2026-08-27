'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const addCommentSchema = z.object({
  issueId: z.string().uuid(),
  content: z.string().min(2, 'Comment must be at least 2 characters'),
});

export async function addComment(issueId: string, content: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const result = addCommentSchema.safeParse({ issueId, content });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const issue = await db.issue.findUnique({
      where: { id: result.data.issueId },
    });

    if (!issue) {
      return { error: 'Issue not found' };
    }

    await db.$transaction(async (tx) => {
      // 1. Create comment
      await tx.comment.create({
        data: {
          issueId: result.data.issueId,
          content: result.data.content,
          authorId: session.id,
        },
      });

      // 2. Log activity
      await tx.activity.create({
        data: {
          issueId: result.data.issueId,
          actorId: session.id,
          action: 'COMMENT_ADDED',
          details: JSON.stringify({ author: session.name }),
        },
      });

      // 3. Notify owner or reporter
      const notifyTarget = session.id === issue.reporterId ? issue.assigneeId : issue.reporterId;
      if (notifyTarget && notifyTarget !== session.id) {
        await tx.notification.create({
          data: {
            userId: notifyTarget,
            title: 'New Comment Added',
            content: `"${session.name}" commented on issue ${issue.key}: "${result.data.content.slice(0, 40)}..."`,
            link: `/issues/${issue.key}`,
          },
        });
      }
    });

    revalidatePath(`/issues/${issue.key}`);
    return { success: true };
  } catch (error) {
    console.error('Add comment error:', error);
    return { error: 'Failed to post comment.' };
  }
}
