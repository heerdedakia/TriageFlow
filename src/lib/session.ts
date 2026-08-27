import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';

const SECRET_KEY = process.env.AUTH_SECRET || 'a_highly_secure_and_random_32_character_secret_key_for_bugzilla';
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function encrypt(payload: SessionUser): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionUser;
  } catch (error) {
    return null;
  }
}
