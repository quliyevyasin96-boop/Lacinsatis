export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import db, { Product, redis, PRODUCTS_KEY } from '@/lib/db';

// Statik məhsullar (fallback)
const STATIC_PRODUCTS = [
  { id: 1, name: 'Çörək (Kiçik)', price: 0.50, created_at: new Date().toISOString() },
  { id: 2, name: 'Çörək (Orta)', price: 0.80, created_at: new Date().toISOString() },
  { id: 3, name: 'Çörək (Böyük)', price: 1.00, created_at: new Date().toISOString() },
  { id: 4, name: 'Sum Çörəyi', price: 1.50, created_at: new Date().toISOString() },
  { id: 5, name: 'Göbələkli Çörək', price: 2.00, created_at: new Date().toISOString() },
  { id: 6, name: 'Südlü Çörək', price: 1.20, created_at: new Date().toISOString() },
];

// Məhsulları al
async function getProducts(): Promise<Product[]> {
  try {
    const products = await redis.get<string>(PRODUCTS_KEY);
    if (products && typeof products === 'string') {
      return JSON.parse(products);
    }
    if (Array.isArray(products)) {
      return products;
    }
    // Əgər yoxdursa, statik məhsulları qaytar
    return STATIC_PRODUCTS;
  } catch (error) {
    console.error('Error getting products:', error);
    return STATIC_PRODUCTS;
  }
}

// GET - Bütün məhsulları gətir
export async function GET() {
  try {
    const products = await getProducts();
    // ID-yə görə sırala
    const sorted = products.sort((a, b) => b.id - a.id);
    return NextResponse.json(sorted);
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}

// POST - Yeni məhsul əlavə et
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: 'Ad və qiymət məcburidir' }, { status: 400 });
    }

    const products = await getProducts();
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    const newProduct: Product = {
      id: newId,
      name,
      price,
      created_at: new Date().toISOString()
    };

    products.push(newProduct);
    await redis.set(PRODUCTS_KEY, JSON.stringify(products));

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json({ error: 'Xəta baş verdi' }, { status: 500 });
  }
}