'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { comparePassword, hashPassword, createSession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role),
});

export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const result = loginSchema.safeParse({ email, password });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password' };
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }

  redirect('/dashboard');
}

export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const roleInput = formData.get('role') as string;

  const result = registerSchema.safeParse({ name, email, password, role: roleInput });
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return { error: 'Email address already registered' };
    }

    const passwordHash = await hashPassword(password);
    
    // Check user counts to assign ADMIN for first user, otherwise use requested role (but prevent self-admin creation)
    const userCount = await db.user.count();
    let assignedRole = result.data.role;

    if (userCount === 0) {
      assignedRole = Role.ADMIN;
    } else if (result.data.role === Role.ADMIN) {
      return { error: 'Access Denied: Admin roles cannot be self-selected during registration.' };
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole,
      },
    });

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }

  redirect('/dashboard');
}

export async function logoutUser() {
  await deleteSession();
  redirect('/login');
}
