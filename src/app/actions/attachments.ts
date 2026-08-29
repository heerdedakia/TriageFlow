'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const uploadAttachmentSchema = z.object({
  issueId: z.string().uuid(),
  name: z.string().min(1, 'File name is required'),
  url: z.string().url('Invalid attachment URL'),
  mimeType: z.string(),
  size: z.number().max(4 * 1024 * 1024, 'File exceeds 4MB size limit'),
});

export type AddAttachmentData = z.infer<typeof uploadAttachmentSchema>;

export async function addAttachment(data: AddAttachmentData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const result = uploadAttachmentSchema.safeParse(data);
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
      // 1. Create attachment record
      await tx.attachment.create({
        data: {
          issueId: result.data.issueId,
          name: result.data.name,
          url: result.data.url,
          mimeType: result.data.mimeType,
          size: result.data.size,
          uploadedById: session.id,
        },
      });

      // 2. Log activity
      await tx.activity.create({
        data: {
          issueId: result.data.issueId,
          actorId: session.id,
          action: 'ATTACHMENT_ADDED',
          details: JSON.stringify({ name: result.data.name }),
        },
      });
    });

    revalidatePath(`/issues/${issue.key}`);
    return { success: true };
  } catch (error) {
    console.error('Add attachment error:', error);
    return { error: 'Failed to upload attachment.' };
  }
}
