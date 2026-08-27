'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(Role),
});

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await getSession();
  
  // Strict server authorization check
  if (!session || session.role !== Role.ADMIN) {
    return { error: 'Access Denied: Only Administrators can change user roles.' };
  }

  const result = updateUserRoleSchema.safeParse({ userId, role: newRole });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Prevent admin from changing their own role (self-lockout safety check)
  if (result.data.userId === session.id) {
    return { error: 'Access Denied: You cannot change your own administrative role.' };
  }

  try {
    await db.user.update({
      where: { id: result.data.userId },
      data: { role: result.data.role },
    });

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Update user role error:', error);
    return { error: 'Failed to update user role.' };
  }
}
