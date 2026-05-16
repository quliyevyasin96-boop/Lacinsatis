// POST /api/migrate-customers
// Bütün mövcud customer-lərə expert_id yazır
// Yalnız admin işlədə bilər

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { expert_id, expert_name } = body;

    if (!expert_id) {
      return NextResponse.json({ error: 'expert_id tələb olunur' }, { status: 400 });
    }

    // Mövcud customer-ləri al
    const raw = await redis.get<string>('customers');
    let customers: any[] = [];

    if (typeof raw === 'string') {
      customers = JSON.parse(raw);
    } else if (Array.isArray(raw)) {
      customers = raw;
    }

    // Artıq expert_id olan customer-ləri saxla, yoxdursa əlavə et
    let updated = 0;
    let added = 0;

    const migrated = customers.map((c: any) => {
      if (!c.expert_id) {
        added++;
        updated++;
        return { ...c, expert_id, expert_name: expert_name || null };
      }
      return c;
    });

    await redis.set('customers', migrated);

    return NextResponse.json({
      success: true,
      total: migrated.length,
      updated,
      added,
      expert_id
    });

  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: 'Migration uğursuz oldu' }, { status: 500 });
  }
}
