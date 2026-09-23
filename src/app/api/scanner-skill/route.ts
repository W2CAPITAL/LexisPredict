import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/server-db';
import { formatProcessScannerSkill, runProcessScannerSkill } from '@/lib/scanner/process-skill';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'gru1';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getUserContext();
    if (!user?.empresa_id) {
      return NextResponse.json({ success: false, error: 'Sessão expirada.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const protocolo = String(body?.protocolo || body?.cnj || body?.numero || '').trim();
    if (!protocolo) {
      return NextResponse.json({ success: false, error: 'Informe o CNJ.' }, { status: 400 });
    }

    const result = await runProcessScannerSkill(protocolo);
    return NextResponse.json({
      ...result,
      formatted: body?.includeFormatted === false ? undefined : formatProcessScannerSkill(result),
    }, {
      status: result.success ? 200 : 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Falha na skill Scanner Processual.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
