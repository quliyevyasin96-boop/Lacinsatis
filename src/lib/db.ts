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
    get: (id: number) => {
      if (query.includes('products')) {
        return STATIC_PRODUCTS.find(p => p.id === id);
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
        return { lastInsertRowid: newSale.id };
      }
      return { lastInsertRowid: 0 };
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
}