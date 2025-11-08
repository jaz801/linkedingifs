import { NextResponse } from 'next/server';

type ClientErrorPayload = {
  error: {
    message?: string | null;
    stack?: string | null;
    name?: string | null;
  };
  context?: Record<string, unknown> | null;
  hint?: string | null;
  url?: string | null;
  userAgent?: string | null;
  timestamp?: number;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ClientErrorPayload;
    const entry = {
      ...payload,
      receivedAt: Date.now(),
    };

    console.error('[client-error]', JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to parse client error payload', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}


