import { NextResponse } from 'next/server';
import { getStateSnapshot } from '../../../lib/state';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: getStateSnapshot()
  });
}
