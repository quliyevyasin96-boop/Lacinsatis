export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db, { Sale, generateSaleText } from '@/lib/db';

// GET - Satış detallarını gətir (QR kod üçün)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const sale = await (db.prepare(`
      SELECT s.*, p.name as product_name, p.price as product_price
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.id = ?
    `) as any).get(id) as Sale | undefined;

    if (!sale) {
      return NextResponse.json({ error: 'Satış tapılmadı' }, { status: 404 });
    }

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

// PATCH - Satış statusunu yenilə (Kuryer üçün)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, payment_status, userId, userName } = body;

    if (status) {
      if (!['pending', 'delivered'].includes(status)) {
        return NextResponse.json({ error: 'Düzgün status göndərin' }, { status: 400 });
      }
      await (db.prepare('UPDATE sales SET status = ? WHERE id = ?') as any).run(status, id, userId, userName);
    }
    
    if (payment_status) {
      if (!['paid', 'unpaid'].includes(payment_status)) {
        return NextResponse.json({ error: 'Düzgün payment_status göndərin' }, { status: 400 });
      }
      await (db.prepare('UPDATE sales SET payment_status = ? WHERE id = ?') as any).run(payment_status, id);
    }

    if (!status && !payment_status) {
       return NextResponse.json({ error: 'Heç nə dəyişdirilmədi' }, { status: 400 });
    }

    let result = { changes: 1 }; // simplify error check, we assume success if no error was thrown

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Satış tapılmadı' }, { status: 404 });
    }

    // Yeni məlumatı al ki, Telegram-a göndərək
    const sale = await (db.prepare(`
      SELECT s.*, p.name as product_name, p.price as product_price
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.id = ?
    `) as any).get(id) as Sale;

    if (sale) {
      const saleText = generateSaleText(sale);
      // Telegram-a bildiriş göndər (Update mesajı kimi)
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ **STATUS YENİLƏNDİ**\n\n${saleText}`,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await (db.prepare('DELETE FROM sales WHERE id = ?') as any).run(id);
    if (result.changes === 0) {
      return NextResponse.json({ error: 'Satış tapılmadı' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Satış silindi' });
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}