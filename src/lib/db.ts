import { Redis } from '@upstash/redis';

// Redis bağlantısı
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const PRODUCTS_KEY = 'products';
export const SALES_KEY = 'sales';
export const EXPENSES_KEY = 'expenses';
export const CUSTOMERS_KEY = 'customers';
export const SALE_ID_COUNTER = 'sale_id_counter';
export const COURIER_LOCATIONS_KEY = 'courier_locations';

export interface Product {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  lat?: number | null;
  lon?: number | null;
  created_at: string;
  expert_id?: number | null;
  expert_name?: string | null;
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
  status?: 'pending' | 'delivered';
  payment_status?: 'paid' | 'unpaid';
  expert_id?: number;
  courier_id?: number;
  expert_name?: string;
  courier_name?: string;
  paid_amount?: number;
  payment_updated_at?: string;
  items?: {
    product_id: number;
    name: string;
    price: number;
    quantity: number;
    gift_quantity?: number;
  }[];
}

const db = {
  prepare: (query: string) => {
    return {
      all: async () => {
        try {
          if (query.includes('FROM products')) {
            const data = await redis.get<string>(PRODUCTS_KEY);
            return data && typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
          }
          if (query.includes('FROM sales')) {
            const data = await redis.get<string>(SALES_KEY);
            let sales = data && typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
            
            // Məhsul adlarını əlavə et (əgər yoxdursa)
            const productsData = await redis.get<string>(PRODUCTS_KEY);
            const products: Product[] = productsData && typeof productsData === 'string' ? JSON.parse(productsData) : (Array.isArray(productsData) ? productsData : []);
            
            return sales.map((sale: any) => {
              const p = products.find(prod => prod.id === sale.product_id);
              return {
                ...sale,
                product_name: p?.name || 'Məhsul',
                product_price: p?.price || 0
              };
            });
          }
          if (query.includes('FROM expenses')) {
            const data = await redis.get<string>(EXPENSES_KEY);
            return data && typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
          }
          if (query.includes('FROM customers')) {
            const data = await redis.get<string>(CUSTOMERS_KEY);
            return data && typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
          }
          return [];
        } catch (error) {
          console.error('db.prepare().all() error:', error);
          return [];
        }
      },
      get: async (...args: any[]) => {
        try {
          if (query.includes('FROM sales') && query.includes('id = ?')) {
            const [id] = args;
            const data = await redis.get<string>(SALES_KEY);
            const sales: Sale[] = data && typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
            const sale = sales.find(s => s.id === Number(id));
            if (sale) {
              const productsData = await redis.get<string>(PRODUCTS_KEY);
              const products: Product[] = productsData && typeof productsData === 'string' ? JSON.parse(productsData) : (Array.isArray(productsData) ? productsData : []);
              const p = products.find(prod => prod.id === sale.product_id);
              return {
                ...sale,
                product_name: p?.name || 'Məhsul',
                product_price: p?.price || 0
              };
            }
          }
          return undefined;
        } catch (error) {
          console.error('db.prepare().get() error:', error);
          return undefined;
        }
      },
      run: async (...args: any[]) => {
        try {
          if (query.includes('INSERT INTO sales')) {
            const [date, customer_name, customer_phone, latitude, longitude, product_id, quantity, gift_quantity, total_amount, qr_data, items, expert_id, expert_name] = args;
            
            let currentId = await redis.get<number>(SALE_ID_COUNTER);
            if (!currentId) currentId = 1;
            
            const newSale: Sale = {
              id: currentId,
              date,
              customer_name,
              customer_phone,
              latitude: latitude || null,
              longitude: longitude || null,
              product_id,
              quantity,
              gift_quantity: gift_quantity || 0,
              total_amount,
              qr_data,
              created_at: new Date().toISOString(),
              status: 'pending',
              payment_status: 'unpaid',
              items: items || null,
              expert_id: expert_id || null,
              expert_name: expert_name || null
            };
            
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            sales.unshift(newSale);
            sales = sales.slice(0, 100);
            
            await redis.set(SALES_KEY, JSON.stringify(sales));
            await redis.set(SALE_ID_COUNTER, currentId + 1);
            
            return { lastInsertRowid: currentId, changes: 1 };
          }

          if (query.includes('UPDATE sales SET status = ? WHERE id = ?')) {
            const [status, id, courier_id, courier_name] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales[idx].status = status;
              if (courier_id) sales[idx].courier_id = courier_id;
              if (courier_name) sales[idx].courier_name = courier_name;
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('UPDATE sales SET payment_status = ? WHERE id = ?')) {
            const [payment_status, id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales[idx].payment_status = payment_status;
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('UPDATE sales SET paid_amount = ? WHERE id = ?')) {
            const [paid_amount, id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales[idx].paid_amount = Number(paid_amount);
              sales[idx].payment_status = Number(paid_amount) >= sales[idx].total_amount ? 'paid' : 'unpaid';
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('UPDATE sales SET items = ? WHERE id = ?')) {
            const [items, id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales[idx].items = items;
              sales[idx].total_amount = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('INSERT INTO expenses')) {
            const [description, amount, date] = args;
            const expensesJson = await redis.get<string>(EXPENSES_KEY);
            let expenses: Expense[] = expensesJson && typeof expensesJson === 'string' ? JSON.parse(expensesJson) : (Array.isArray(expensesJson) ? expensesJson : []);
            const newExpense: Expense = {
              id: Date.now(),
              description,
              amount,
              date,
              created_at: new Date().toISOString()
            };
            expenses.unshift(newExpense);
            await redis.set(EXPENSES_KEY, JSON.stringify(expenses));
            return { lastInsertRowid: newExpense.id, changes: 1 };
          }
          
          if (query.includes('INSERT INTO customers')) {
            const [name, phone, lat, lon] = args;
            const customersJson = await redis.get<string>(CUSTOMERS_KEY);
            let customers: Customer[] = customersJson && typeof customersJson === 'string' ? JSON.parse(customersJson) : (Array.isArray(customersJson) ? customersJson : []);
            const newCustomer: Customer = {
              id: Date.now(),
              name,
              phone,
              lat,
              lon,
              created_at: new Date().toISOString()
            };
            customers.unshift(newCustomer);
            await redis.set(CUSTOMERS_KEY, JSON.stringify(customers));
            return { lastInsertRowid: newCustomer.id, changes: 1 };
          }
          
          if (query.includes('DELETE FROM sales')) {
            const [id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales.splice(idx, 1);
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('DELETE FROM products')) {
            const [id] = args;
            const productsJson = await redis.get<string>(PRODUCTS_KEY);
            let products: Product[] = productsJson && typeof productsJson === 'string' ? JSON.parse(productsJson) : (Array.isArray(productsJson) ? productsJson : []);
            const idx = products.findIndex(p => p.id === Number(id));
            if (idx !== -1) {
              products.splice(idx, 1);
              await redis.set(PRODUCTS_KEY, JSON.stringify(products));
              return { lastInsertRowid: 0, changes: 1 };
            }
          }
          
          if (query.includes('DELETE FROM customers WHERE id = ?')) {
            const [id] = args;
            const customersJson = await redis.get<string>(CUSTOMERS_KEY);
            let customers: Customer[] = customersJson && typeof customersJson === 'string' ? JSON.parse(customersJson) : (Array.isArray(customersJson) ? customersJson : []);
            const initialLength = customers.length;
            customers = customers.filter(c => c.id !== Number(id));
            await redis.set(CUSTOMERS_KEY, JSON.stringify(customers));
            return { lastInsertRowid: 0, changes: initialLength !== customers.length ? 1 : 0 };
          }

          if (query.includes('DELETE FROM expenses')) {
            const [id] = args;
            const expensesJson = await redis.get<string>(EXPENSES_KEY);
            let expenses: Expense[] = expensesJson && typeof expensesJson === 'string' ? JSON.parse(expensesJson) : (Array.isArray(expensesJson) ? expensesJson : []);
            // Use string comparison to be safe with types
            const idx = expenses.findIndex(e => String(e.id) === String(id));
            if (idx !== -1) {
              expenses.splice(idx, 1);
              await redis.set(EXPENSES_KEY, JSON.stringify(expenses));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('UPDATE expenses SET')) {
            const [description, amount, id] = args;
            const expensesJson = await redis.get<string>(EXPENSES_KEY);
            let expenses: Expense[] = expensesJson && typeof expensesJson === 'string' ? JSON.parse(expensesJson) : (Array.isArray(expensesJson) ? expensesJson : []);
            const idx = expenses.findIndex(e => String(e.id) === String(id));
            if (idx !== -1) {
              expenses[idx].description = description;
              expenses[idx].amount = amount;
              await redis.set(EXPENSES_KEY, JSON.stringify(expenses));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }
          
          if (query.includes('INSERT INTO products')) {
            const [name, price] = args;
            const productsJson = await redis.get<string>(PRODUCTS_KEY);
            let products: Product[] = productsJson && typeof productsJson === 'string' ? JSON.parse(productsJson) : (Array.isArray(productsJson) ? productsJson : []);
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            const newProduct: Product = { id: newId, name, price, created_at: new Date().toISOString() };
            products.push(newProduct);
            await redis.set(PRODUCTS_KEY, JSON.stringify(products));
            return { lastInsertRowid: newId, changes: 1 };
          }

          if (query.includes('UPDATE sales SET paid_amount')) {
            const [paid_amount, id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              sales[idx].paid_amount = Number(paid_amount);
              sales[idx].payment_updated_at = new Date().toISOString();
              sales[idx].payment_status = Number(paid_amount) >= sales[idx].total_amount ? 'paid' : 'unpaid';
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }

          if (query.includes('UPDATE sales SET items')) {
            const [items, total_amount, customer_name, customer_phone, date, id] = args;
            const salesJson = await redis.get<string>(SALES_KEY);
            let sales: Sale[] = salesJson && typeof salesJson === 'string' ? JSON.parse(salesJson) : (Array.isArray(salesJson) ? salesJson : []);
            const idx = sales.findIndex(s => s.id === Number(id));
            if (idx !== -1) {
              if (items !== undefined) sales[idx].items = items;
              if (total_amount !== undefined) sales[idx].total_amount = total_amount;
              if (customer_name !== undefined) sales[idx].customer_name = customer_name;
              if (customer_phone !== undefined) sales[idx].customer_phone = customer_phone;
              if (date !== undefined) sales[idx].date = date;
              await redis.set(SALES_KEY, JSON.stringify(sales));
              return { lastInsertRowid: 0, changes: 1 };
            }
            return { lastInsertRowid: 0, changes: 0 };
          }
          
          return { lastInsertRowid: 0, changes: 0 };
        } catch (error) {
          console.error('db.prepare().run() error:', error);
          return { lastInsertRowid: 0, changes: 0 };
        }
      },
    };
  },
};

export default db;

// Satış mətn generatoru
export function generateSaleText(sale: Sale): string {
  const date = new Date(sale.created_at).toLocaleString('az-AZ', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  
  const location = sale.latitude && sale.longitude 
    ? `📍 Lokasiya: https://maps.google.com/?q=${sale.latitude},${sale.longitude}` 
    : '📍 Lokasiya: Yoxdur';
  
  const giftText = sale.gift_quantity > 0 ? `\n🎁 Ümumi Hədiyyə: ${sale.gift_quantity} ədəd` : '';
  const statusEmoji = sale.status === 'delivered' ? '✅ Çatdırıldı' : '⏳ Gözləyir';
  const expertInfo = sale.expert_name ? `✍️ Ekspeditor: ${sale.expert_name}\n` : (sale.expert_id ? `✍️ Ekspeditor ID: ${sale.expert_id}\n` : '');
  const courierInfo = sale.courier_name ? `🚚 Kuryer: ${sale.courier_name}\n` : (sale.courier_id ? `🚚 Kuryer ID: ${sale.courier_id}\n` : '');

  let itemsText = '';
  if (sale.items && sale.items.length > 0) {
    itemsText = sale.items.map(item => `• ${item.name}: ${item.quantity} ədəd${item.gift_quantity ? ` (+${item.gift_quantity} 🎁)` : ''}`).join('\n');
  } else {
    itemsText = `• ${sale.product_name || 'Məhsul'}: ${sale.quantity} ədəd`;
  }

  return `🍞 YENİ SİFARİŞ #${sale.id}
[${statusEmoji}]

${expertInfo}${courierInfo}
📅 Tarix: ${date}
👤 Müştəri: ${sale.customer_name}
📱 Nömrə: ${sale.customer_phone || 'Yoxdur'}

🛒 Sifariş:
${itemsText}

💰 Ümumi: ${sale.total_amount.toFixed(2)} ₼
${giftText}
${location}
`;
}