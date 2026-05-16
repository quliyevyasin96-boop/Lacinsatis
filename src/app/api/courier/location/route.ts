export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { redis, COURIER_LOCATIONS_KEY } from '@/lib/db';

interface CourierLocation {
  courier_id: number;
  courier_name?: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

// GET /api/courier/location - Bütün kuryerlərin lokasiyalarını gətir
export async function GET() {
  try {
    const data = await redis.get<string>(COURIER_LOCATIONS_KEY);
    const locations: Record<string, CourierLocation> = data && typeof data === 'string' 
      ? JSON.parse(data) 
      : (typeof data === 'object' && data !== null ? data : {});

    // Yalnız son 10 dəqiqə ərzində aktiv olanları filter et
    const now = Date.now();
    const activeLocations = Object.values(locations).filter(loc => {
      const updatedTime = new Date(loc.updated_at).getTime();
      return (now - updatedTime) < 10 * 60 * 1000; // 10 dəqiqə
    });

    return NextResponse.json(activeLocations);
  } catch (error) {
    console.error('Courier locations GET error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

// POST /api/courier/location - Kuryer lokasiyasını yenilə
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courier_id, courier_name, latitude, longitude } = body;

    if (!courier_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'courier_id, latitude və longitude məcburidir' }, { status: 400 });
    }

    const data = await redis.get<string>(COURIER_LOCATIONS_KEY);
    const locations: Record<string, CourierLocation> = data && typeof data === 'string' 
      ? JSON.parse(data) 
      : (typeof data === 'object' && data !== null ? data : {});

    // Kuryerin lokasiyasını yenilə
    locations[String(courier_id)] = {
      courier_id: Number(courier_id),
      courier_name: courier_name || locations[String(courier_id)]?.courier_name || `Kuryer ${courier_id}`,
      latitude: Number(latitude),
      longitude: Number(longitude),
      updated_at: new Date().toISOString()
    };

    await redis.set(COURIER_LOCATIONS_KEY, JSON.stringify(locations));

    return NextResponse.json({ 
      success: true, 
      updated_at: locations[String(courier_id)].updated_at 
    });
  } catch (error) {
    console.error('Courier location POST error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}
