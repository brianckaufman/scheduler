import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI generation is not configured for this site.' },
      { status: 503 }
    );
  }

  // Rate limit: 10 AI generations per IP per hour
  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 'ai-generate', { limit: 10, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429 }
    );
  }

  let body: {
    eventName?: string;
    eventType?: string;
    location?: string;
    description?: string;
    prompt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { eventName, eventType, location, description, prompt } = body;

  const contextLines = [
    eventName    && `Event: ${eventName}`,
    eventType    && `Type: ${eventType === 'fixed' ? 'Fixed-date event (people RSVP yes/no)' : 'Finding the best time to meet'}`,
    location     && `Location: ${location}`,
    description  && `Short description: ${description}`,
    prompt       && `Additional context the organizer wants included: ${prompt}`,
  ].filter(Boolean).join('\n');

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: `You write warm, friendly, practical event descriptions in HTML.
Rules:
- Use ONLY these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>
- 2–4 short paragraphs or a mix of paragraphs and a short list
- Do NOT repeat the event name as a heading — it is already shown above
- Tone: friendly, clear, useful — like an email from a friend who organised a get-together
- Do not add generic filler like "We hope to see you there!" unless it fits naturally
- Output raw HTML only, no markdown, no code fences`,
      messages: [
        {
          role: 'user',
          content: `Write a description for this event:\n${contextLines || 'No details provided — write something generic and friendly.'}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected AI response');

    return NextResponse.json({ html: content.text.trim() });
  } catch (err) {
    console.error('[AI generate-description]', err);
    return NextResponse.json(
      { error: 'AI generation failed. Please try again.' },
      { status: 500 }
    );
  }
}
