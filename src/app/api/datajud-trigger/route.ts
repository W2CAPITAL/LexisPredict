/**
 * @fileOverview Trigger assíncrono — dispara worker BOTH (substitui Cron no Hobby)
 */
import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-db';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { empresa_id } = await getUserContext();
    if (!empresa_id) return new Response('Unauthorized', { status: 401 });

    let mode = 'both';
    let scope = 'full';
    let since: string | null = null;
    try {
      const body = await request.clone().json().catch(() => ({}));
      if (body?.mode && ['datajud', 'djen', 'both'].includes(body.mode)) mode = body.mode;
      if (body?.scope && ['full', 'cumprimento'].includes(body.scope)) scope = body.scope;
      if (body?.since) since = String(body.since);
    } catch {
      /* ignore */
    }

    const h = await headers();
    const host = h.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `${protocol}://${host}`;

    const params = new URLSearchParams({
      empresa_id: String(empresa_id),
      mode,
      scope,
    });
    if (since) params.set('since', since);

    // Sem Cron e sem fire-and-forget: o clique do operador mantém este lote vivo
    // até o worker responder. A UI dispara o próximo lote apenas depois.
    const workerResponse = await fetch(
      `${baseUrl}/api/datajud-worker?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.DATAJUD_WORKER_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, scope, since }),
        cache: 'no-store',
      }
    );

    const payload = await workerResponse.json().catch(() => ({}));
    if (!workerResponse.ok) {
      return NextResponse.json(
        { started: false, mode, scope, since, worker: payload },
        { status: workerResponse.status }
      );
    }

    return NextResponse.json({ started: true, mode, scope, since, worker: payload });
  } catch (error: any) {
    return NextResponse.json({ started: false, error: error.message }, { status: 500 });
  }
}
