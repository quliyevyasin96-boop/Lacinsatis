export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const customers = await (db.prepare('SELECT * FROM customers') as any).all();
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, lat, lon } = body;
    
    if (!name || !phone) {
      return NextResponse.json({ error: 'Ad və telefon mütləqdir' }, { status: 400 });
    }

    const result = await (db.prepare('INSERT INTO customers (name, phone, lat, lon) VALUES (?, ?, ?, ?)') as any).run(
      name, phone, lat || null, lon || null
    );

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
