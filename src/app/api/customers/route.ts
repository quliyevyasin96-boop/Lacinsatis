export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expert_id');

    let customers = await (db.prepare('SELECT * FROM customers') as any).all();

    // Admin olmayan ekspeditor yalnız öz əlavə etdiyi marketləri görür
    if (expertId) {
      const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
      const isAdmin = adminIds.includes(expertId);

      if (!isAdmin) {
        customers = customers.filter((c: any) =>
          c.expert_id && String(c.expert_id) === String(expertId)
        );
      }
    }

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, lat, lon, tg_user_id, userName } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Ad və telefon mütləqdir' }, { status: 400 });
    }

    const result = await (db.prepare('INSERT INTO customers (name, phone, lat, lon) VALUES (?, ?, ?, ?)') as any).run(
      name, phone, lat || null, lon || null
    );

    // Yeni customer-ə expert_id və expert_name yaz
    if (tg_user_id) {
      const customersJson = await (db.prepare('SELECT * FROM customers') as any).all();
      const idx = customersJson.findIndex((c: any) => c.id === result.lastInsertRowid);
      if (idx !== -1) {
        customersJson[idx].expert_id = tg_user_id;
        customersJson[idx].expert_name = userName || null;
        await (db as any)._redis.set('customers', JSON.stringify(customersJson));
      }
    }

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
