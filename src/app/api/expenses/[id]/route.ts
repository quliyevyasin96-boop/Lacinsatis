import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await (db.prepare('DELETE FROM expenses WHERE id = ?') as any).run(id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Xərc tapılmadı' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Xərc silindi' });
  } catch (error) {
    console.error('Expense delete error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { description, amount } = body;
    
    if (!description || !amount) {
      return NextResponse.json({ error: 'Məlumatlar çatışmır' }, { status: 400 });
    }
    
    const result = await (db.prepare('UPDATE expenses SET description = ?, amount = ? WHERE id = ?') as any).run(description, amount, id);
    
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Xərc tapılmadı' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Xərc yeniləndi' });
  } catch (error) {
    console.error('Expense patch error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
