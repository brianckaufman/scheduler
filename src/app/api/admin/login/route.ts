import { NextResponse } from 'next/server';
import { verifyPassword, setAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    await setAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
