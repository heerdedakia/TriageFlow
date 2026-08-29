import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../lib/auth';
import { encrypt, decrypt } from '../lib/session';

describe('Auth Utilities', () => {
  it('hashes and compares passwords correctly', async () => {
    const password = 'mySecretPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword('wrongpassword', hash)).toBe(false);
  });

  it('encrypts and decrypts session data', async () => {
    const payload = { userId: '123', role: 'ADMIN' };
    const encrypted = await encrypt(payload);
    
    expect(typeof encrypted).toBe('string');
    
    const decrypted = await decrypt(encrypted) as any;
    expect(decrypted.userId).toBe(payload.userId);
    expect(decrypted.role).toBe(payload.role);
  });
});
