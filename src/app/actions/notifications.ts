'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getNotifications() {
  const session = await getSession();
  if (!session) return [];

  return await db.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export async function markNotificationRead(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.notification.update({
      where: { id, userId: session.id },
      data: { isRead: true },
    });
    
    revalidatePath('/(authenticated)', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Mark notification read error:', error);
    return { error: 'Failed to update notification' };
  }
}
