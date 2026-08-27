'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const saveFilterSchema = z.object({
  name: z.string().min(2, 'Filter name must be at least 2 characters'),
  query: z.string(), // JSON string representing the search state
});

export async function saveFilter(name: string, queryJson: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const result = saveFilterSchema.safeParse({ name, query: queryJson });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const existing = await db.savedFilter.findFirst({
      where: { name: result.data.name, userId: session.id },
    });

    if (existing) {
      return { error: 'A saved filter with this name already exists.' };
    }

    await db.savedFilter.create({
      data: {
        name: result.data.name,
        query: result.data.query,
        userId: session.id,
      },
    });

    revalidatePath('/issues');
    return { success: true };
  } catch (error) {
    console.error('Save filter error:', error);
    return { error: 'Failed to save filter.' };
  }
}

export async function deleteFilter(id: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await db.savedFilter.delete({
      where: { id, userId: session.id },
    });

    revalidatePath('/issues');
    return { success: true };
  } catch (error) {
    console.error('Delete filter error:', error);
    return { error: 'Failed to delete filter.' };
  }
}
