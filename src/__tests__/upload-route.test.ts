import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';
import { POST } from '@/app/api/upload/route';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockResolvedValue({ id: 'user1', role: 'ADMIN' })
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('192.168.1.1')
  })
}));

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.example.com/test-file.txt' })
}));

describe('Rate Limiter Module', () => {
  it('allows requests within rate limits and rejects exceeding ones', () => {
    const testIp = '127.0.0.2';
    // 5 attempts max in 1 second window
    for (let i = 0; i < 5; i++) {
      const res = rateLimit(testIp, { max: 5, windowMs: 10000 });
      expect(res.success).toBe(true);
    }
    const failedRes = rateLimit(testIp, { max: 5, windowMs: 10000 });
    expect(failedRes.success).toBe(false);
  });
});

describe('Upload Route API Handler', () => {
  it('accepts valid files within size and MIME limits', async () => {
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe('https://blob.example.com/test-file.txt');
  });

  it('rejects oversized files', async () => {
    // 5MB file (exceeds 4MB limit)
    const largeContent = new Uint8Array(5 * 1024 * 1024);
    const file = new File([largeContent], 'large.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('size');
  });

  it('rejects invalid MIME types', async () => {
    const file = new File(['dummy content'], 'test.html', { type: 'text/html' });
    const formData = new FormData();
    formData.append('file', file);

    const request = new Request('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('type');
  });
});
