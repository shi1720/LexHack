import { PrivateResponse as Response } from '@/server/http';
import { CORPUS_SIZE, ALL_PACKS } from '@annex/engine';
import { db } from '@/server/db';
import { narrativeAvailable } from '@/server/narrative';
export const dynamic = 'force-dynamic';
export function GET() {
  db().prepare('SELECT 1').get();
  return Response.json({ status: 'ok', app: 'Annex', controls: CORPUS_SIZE, packs: ALL_PACKS.length, explanations: narrativeAvailable(), mode: process.env.ANNEX_PUBLIC_DEMO === '1' ? 'temporary-demo' : 'self-hosted' }, { headers: { 'Cache-Control': 'no-store' } });
}
