import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'application/zip'];

export async function POST(request: Request) {
  try {
    // 1. Authenticate user session
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Enforce rate limiting (10 uploads per minute per IP)
    const ip = headers().get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateLimitResult = rateLimit(ip, { max: 10, windowMs: 60000 });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const form = await request.formData();
    const file = form.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file size <= 4MB
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds the 4MB limit' }, { status: 400 });
    }

    // 4. Validate MIME type
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type) || file.type.startsWith('image/');
    if (!isMimeAllowed) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const blob = await put(file.name, file, { access: 'public' });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
