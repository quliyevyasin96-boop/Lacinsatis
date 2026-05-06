// Statik məhsullar siyahısı - Vercel üçün
const STATIC_PRODUCTS = [
  { id: 1, name: 'Çörək (Kiçik)', price: 0.50, created_at: new Date().toISOString() },
  { id: 2, name: 'Çörək (Orta)', price: 0.80, created_at: new Date().toISOString() },
  { id: 3, name: 'Çörək (Böyük)', price: 1.00, created_at: new Date().toISOString() },
  { id: 4, name: 'Sum Çörəyi', price: 1.50, created_at: new Date().toISOString() },
  { id: 5, name: 'Göbələkli Çörək', price: 2.00, created_at: new Date().toISOString() },
  { id: 6, name: 'Südlü Çörək', price: 1.20, created_at: new Date().toISOString() },
];

// Sales-ları yaddaşda saxlayaq (Vercel üçün)
let sales: Sale[] = [];
let saleIdCounter = 1;

// Mock db obyekti
const db = {
  prepare: (query: string) => ({
    all: () => {
      if (query.includes('SELECT') && query.includes('products')) {
        return STATIC_PRODUCTS;
      }
      if (query.includes('SELECT') && query.includes('sales')) {
        return sales.slice(0, 50);
      }
      return [];
    },
    get: (id: number | string) => {
      const numId = typeof id === 'string' ? parseInt(id) : id;
      if (query.includes('products')) {
        return STATIC_PRODUCTS.find(p => p.id === numId);
      }
      if (query.includes('sales')) {
        return sales.find(s => s.id === numId);
      }
      return undefined;
    },
    run: (...args: any[]) => {
      if (query.includes('INSERT INTO sales')) {
        const [date, customer_name, customer_phone, latitude, longitude, product_id, quantity, gift_quantity, total_amount, qr_data] = args;
        const newSale: Sale = {
          id: saleIdCounter++,
          date,
          customer_name,
          customer_phone,
          latitude,
          longitude,
          product_id,
          quantity,
          gift_quantity,
          total_amount,
          qr_data,
          created_at: new Date().toISOString(),
        };
        sales.unshift(newSale);
        return { lastInsertRowid: newSale.id, changes: 1 };
      }
      if (query.includes('DELETE FROM products')) {
        const [id] = args;
        const idx = STATIC_PRODUCTS.findIndex(p => p.id === Number(id));
        if (idx !== -1) {
          STATIC_PRODUCTS.splice(idx, 1);
          return { lastInsertRowid: 0, changes: 1 };
        }
        return { lastInsertRowid: 0, changes: 0 };
      }
      if (query.includes('INSERT INTO products')) {
        return { lastInsertRowid: STATIC_PRODUCTS.length + 1, changes: 1 };
      }
      return { lastInsertRowid: 0, changes: 0 };
    },
  }),
};

export default db;

export interface Product {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

export interface Sale {
  id: number;
  date: string;
  customer_name: string;
  customer_phone: string;
  latitude: number | null;
  longitude: number | null;
  product_id: number;
  quantity: number;
  gift_quantity: number;
  total_amount: number;
  qr_data: string | null;
  created_at: string;
  product_name?: string;
  product_price?: number;
  sale_text?: string;
}

// Satış mətn generatoru
export function generateSaleText(sale: Sale): string {
  const date = new Date(sale.created_at).toLocaleString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const location = sale.latitude && sale.longitude 
    ? `📍 Lokasiya: https://maps.google.com/?q=${sale.latitude},${sale.longitude}` 
    : '📍 Lokasiya: Yoxdur';
  
  const giftText = sale.gift_quantity > 0 ? `\n🎁 Hədiyyə: ${sale.gift_quantity} ədəd` : '';
  
  return `🍞 YENİ SİFARİŞ #${sale.id}

📅 Tarix: ${date}
👤 Müştəri: ${sale.customer_name}
📱 Nömrə: ${sale.customer_phone || 'Yoxdur'}

🍞 Məhsul: ${sale.product_name || 'Naməlum'}
📦 Miqdar: ${sale.quantity} ədəd${giftText}
💰 Ümumi: ${sale.total_amount.toFixed(2)} ₼

${location}
`;
}
