import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { encrypt, decrypt, SessionUser } from './session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const sessionToken = await encrypt(user);
  
  cookies().set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const sessionToken = cookies().get('session')?.value;
  if (!sessionToken) return null;
  return await decrypt(sessionToken);
}

export async function deleteSession() {
  cookies().delete('session');
}
