export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db, { Sale, generateSaleText } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expert_id');

    let sales = await (db.prepare('SELECT * FROM sales') as any).all();

    // Ekspeditor özü daxil olubsa, yalnız öz satışlarını göstər
    if (expertId) {
      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
      const isAdmin = adminIds.includes(expertId);
      
      // Admin olmayan ekspeditor yalnız öz satışlarını görür
      if (!isAdmin) {
        sales = sales.filter((sale: Sale) => 
          sale.expert_id && String(sale.expert_id) === String(expertId)
        );
      }
      // Admin olduqda bütün satışları görür — filter yoxdur
    }

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Sales GET error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, customer_name, customer_phone, latitude, longitude, items, gift_quantity, tg_user_id, userName } = body;
    
    if (!customer_name || !items || items.length === 0) {
      return NextResponse.json({ error: 'Məlumatlar çatışmır' }, { status: 400 });
    }
    
    // Ümumi məbləği hesabla
    const total_amount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    
    const result = await (db.prepare('INSERT INTO sales') as any).run(
      date, customer_name, customer_phone, latitude, longitude, 
      items[0].product_id, items[0].quantity, gift_quantity, 
      total_amount, null, items, tg_user_id, userName
    );
    
    // Yeni yaradılmış satışı al
    const sale = await (db.prepare('SELECT * FROM sales WHERE id = ?') as any).get(result.lastInsertRowid) as Sale;
    
    const saleText = generateSaleText(sale);
    
    // Telegram-a bildiriş göndər
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    
    if (token && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: saleText,
            parse_mode: 'HTML',
          }),
        });
      } catch (tgErr) {
        console.error('Telegram notification error:', tgErr);
      }
    }
    
    return NextResponse.json({ 
      id: result.lastInsertRowid, 
      sale_id: result.lastInsertRowid,
      sale_text: saleText,
      success: true 
    });
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
