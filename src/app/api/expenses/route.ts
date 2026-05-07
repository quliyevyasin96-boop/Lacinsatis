export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const expenses = await (db.prepare('SELECT * FROM expenses') as any).all();
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount, date } = body;
    
    if (!description || !amount || !date) {
      return NextResponse.json({ error: 'Məlumatlar çatışmır' }, { status: 400 });
    }
    
    await (db.prepare('INSERT INTO expenses') as any).run(description, parseFloat(amount), date);
    return NextResponse.json({ message: 'Xərc əlavə edildi' });
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
