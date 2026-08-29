'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const createProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  key: z.string().min(2, 'Project key must be at least 2 characters').toUpperCase(),
  description: z.string().optional(),
});

const createComponentSchema = z.object({
  name: z.string().min(2, 'Component name must be at least 2 characters'),
  description: z.string().optional(),
  projectId: z.string().uuid(),
});

export type ActionState = { error?: string; success?: boolean } | null | undefined;

export async function createProject(prevState: ActionState, formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.PROJECT_MANAGER)) {
    return { error: 'Access Denied: Only Admins or Project Managers can create projects.' };
  }

  const name = formData.get('name') as string;
  const key = formData.get('key') as string;
  const description = formData.get('description') as string;

  const result = createProjectSchema.safeParse({ name, key, description });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const existingProject = await db.project.findFirst({
      where: {
        OR: [
          { name: result.data.name },
          { key: result.data.key },
        ],
      },
    });

    if (existingProject) {
      return { error: 'Project name or key already exists' };
    }

    await db.project.create({
      data: {
        name: result.data.name,
        key: result.data.key,
        description: result.data.description,
        leadId: session.id,
      },
    });

    revalidatePath('/projects');
    return { success: true };
  } catch (error) {
    console.error('Create project error:', error);
    return { error: 'Failed to create project.' };
  }
}

export async function createComponent(prevState: ActionState, formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.PROJECT_MANAGER)) {
    return { error: 'Access Denied: Only Admins or Project Managers can create components.' };
  }

  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const projectId = formData.get('projectId') as string;

  const result = createComponentSchema.safeParse({ name, description, projectId });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const existingComponent = await db.component.findFirst({
      where: {
        name: result.data.name,
        projectId: result.data.projectId,
      },
    });

    if (existingComponent) {
      return { error: 'Component with this name already exists in this project.' };
    }

    await db.component.create({
      data: {
        name: result.data.name,
        description: result.data.description,
        projectId: result.data.projectId,
      },
    });

    revalidatePath(`/projects/${result.data.projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Create component error:', error);
    return { error: 'Failed to create component.' };
  }
}
