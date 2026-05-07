export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ role: null, error: 'User ID missing' }, { status: 400 });
    }

    const expeditorIds = (process.env.EKSPEDITOR_IDS || '').split(',').map(id => id.trim());
    const courierIds = (process.env.COURIER_IDS || '').split(',').map(id => id.trim());
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());

    const uid = userId.toString();

    if (adminIds.includes(uid)) {
      return NextResponse.json({ role: 'admin' });
    } else if (courierIds.includes(uid)) {
      return NextResponse.json({ role: 'courier' });
    } else if (expeditorIds.includes(uid)) {
      return NextResponse.json({ role: 'expeditor' });
    }

    return NextResponse.json({ role: null });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ role: null, error: 'Server error' }, { status: 500 });
  }
}
