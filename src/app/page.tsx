'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
}

interface BasketItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  gift_quantity?: number;
}

interface SaleResult {
  id: number;
  sale_id?: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  gift_quantity: number;
  sale_text?: string;
  created_at: string;
  status: 'pending' | 'delivered';
  payment_status?: 'paid' | 'unpaid';
  latitude?: number;
  longitude?: number;
  items?: BasketItem[];
  date?: string;
  paid_amount?: number;
  payment_updated_at?: string;
  expert_id?: number;
  expert_name?: string;
  courier_id?: number;
  courier_name?: string;
}

export default function Home() {
  const [sdkReady, setSdkReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isActualAdmin, setIsActualAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'courier' | 'expeditor' | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [allSales, setAllSales] = useState<SaleResult[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<number | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'stats' | 'expenses' | 'map' | 'customers' | 'reports'>('sales');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleResult | null>(null);
  const [showMarketList, setShowMarketList] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductPanel, setShowProductPanel] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editExpDesc, setEditExpDesc] = useState('');
  const [editExpAmount, setEditExpAmount] = useState('');

  // Reporting & filtering state
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Partial payment modal state
  const [showPayModal, setShowPayModal] = useState<{ id: number; total: number; paid: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');

  // Order-edit modal state
  const [editingSale, setEditingSale] = useState<SaleResult | null>(null);
  const [editSaleItems, setEditSaleItems] = useState<BasketItem[]>([]);
  const [editSaleCustomer, setEditSaleCustomer] = useState('');
  const [editSalePhone, setEditSalePhone] = useState('');
  const [editSaleDate, setEditSaleDate] = useState('');

  // Expeditor: new market registration view
  const [showMarketReg, setShowMarketReg] = useState(false);
  const [regMarketName, setRegMarketName] = useState('');
  const [regMarketPhone, setRegMarketPhone] = useState('');
  const [regMarketLocation, setRegMarketLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Expeditor: debt payment
  const [showDebtPanel, setShowDebtPanel] = useState(false);
  const [debtPaySaleId, setDebtPaySaleId] = useState<number | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState('');
  const [debtPayLoading, setDebtPayLoading] = useState(false);

  // Unikal marketlər siyahısı (yaddaş)
  const dbMarkets = customers.map(c => ({ name: c.name, phone: c.phone, lat: c.lat, lon: c.lon }));
  const salesMarkets = allSales.filter(s => s.customer_name).map(s => ({ name: s.customer_name, phone: s.customer_phone, lat: s.latitude, lon: s.longitude }));
  const uniqueMarkets = Array.from(new Map(
    [...dbMarkets, ...salesMarkets]
      .filter(m => m.name)
      .map(m => [m.name.toLowerCase().trim() + (m.phone || ''), m])
  ).values());

  // Date-filtered sales (used across admin tabs)
  const filteredSales = allSales.filter(s => {
    const sDate = s.date || s.created_at?.split('T')[0] || '';
    if (filterFrom && sDate < filterFrom) return false;
    if (filterTo && sDate > filterTo) return false;
    return true;
  });

  // Debt helpers
  const getSaleDebt = (s: SaleResult) => Math.max(0, s.total_amount - (s.paid_amount || 0));

  const debtorMap: Record<string, number> = filteredSales.reduce((acc, s) => {
    const debt = getSaleDebt(s);
    if (debt > 0) acc[s.customer_name] = (acc[s.customer_name] || 0) + debt;
    return acc;
  }, {} as Record<string, number>);

  // Gift/bonus totals
  const giftStats = filteredSales.reduce(
    (acc, s) => {
      s.items?.forEach(item => {
        const gq = Number(item.gift_quantity) || 0;
        if (gq > 0) {
          acc.totalQty += gq;
          acc.totalValue += gq * (item.price || 0);
        }
      });
      return acc;
    },
    { totalQty: 0, totalValue: 0 }
  );

  // Sales aggregated by day (for chart/table)
  const salesByDay: Record<string, number> = filteredSales.reduce((acc, s) => {
    const day = s.date || s.created_at?.split('T')[0] || 'N/A';
    acc[day] = (acc[day] || 0) + s.total_amount;
    return acc;
  }, {} as Record<string, number>);
  const salesByDayEntries = Object.entries(salesByDay).sort(([a], [b]) => a.localeCompare(b));
  const maxDayTotal = salesByDayEntries.length ? Math.max(...salesByDayEntries.map(([, v]) => v)) : 1;

  // Authorization check
  async function checkAuth(userId: number) {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.role) {
        setRole(data.role);
        if (data.role === 'admin') setIsActualAdmin(true);
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setIsAuthorized(false);
    } finally {
      setAuthLoading(false);
    }
  }

  // Siyahını bağlamaq üçün click handler
  useEffect(() => {
    const handleGlobalClick = () => setShowMarketList(false);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Telegram SDK initialization
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const init = () => {
      if (tg) {
        tg.ready();
        tg.expand();
        setDarkMode(tg.colorScheme === 'dark');
        const userId = tg.initDataUnsafe?.user?.id;
        if (userId) checkAuth(userId);
        else {
          setIsAuthorized(false);
          setAuthLoading(false);
        }
      } else {
        // Dev fallback - only for localhost
        if (window.location.hostname === 'localhost') {
          setRole('admin');
          setIsActualAdmin(true);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
        setAuthLoading(false);
      }
      setSdkReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (sdkReady && isAuthorized) {
      setDate(new Date().toISOString().split('T')[0]);
      fetchProducts();
      fetchCustomers();
      if (role === 'admin' || role === 'courier' || role === 'expeditor') fetchAllSales();
      if (role === 'admin') fetchExpenses();
    }
  }, [sdkReady, isAuthorized, role]);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setError('Məhsullar yüklənə bilmədi');
    }
  }

  async function fetchAllSales() {
    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id;
      let url = '/api/sales';
      if (userId) {
        url = `/api/sales?expert_id=${userId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setAllSales(data);
    } catch {
      setError('Satışlar yüklənə bilmədi');
    }
  }

  async function fetchExpenses() {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchCustomers() {
    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id;
      const url = userId ? `/api/customers?expert_id=${userId}` : '/api/customers';
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  async function addCustomer() {
    if (!newCustName || !newCustPhone) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustName, phone: newCustPhone })
      });
      if (res.ok) {
        setNewCustName('');
        setNewCustPhone('');
        fetchCustomers();
      }
    } catch {
      setError('Müştəri əlavə edilmədi');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCustomer(id: number) {
    if (!confirm('Bu müştərini silmək istəyirsiniz?')) return;
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch {
      setError('Müştəri silinmədi');
    }
  }

  async function addProduct() {
    if (!newProductName || !newProductPrice) return;
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProductName, price: parseFloat(newProductPrice) })
      });
      if (res.ok) {
        setNewProductName('');
        setNewProductPrice('');
        fetchProducts();
      }
    } catch (err) {
      setError('Məhsul əlavə edilmədi');
    } finally {
      setLoading(false);
    }
  }

  async function addExpense() {
    if (!newExpDesc || !newExpAmount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newExpDesc, amount: parseFloat(newExpAmount), date: new Date().toISOString().split('T')[0] })
      });
      if (res.ok) {
        setNewExpDesc('');
        setNewExpAmount('');
        fetchExpenses();
      }
    } catch (err) {
      setError('Xərc əlavə edilmədi');
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(id: number) {
    if (!confirm('Bu xərci silmək istəyirsiniz?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExpenses();
    } catch (err) {
      setError('Silinmədi');
    } finally {
      setLoading(false);
    }
  }

  async function updateExpense(id: number) {
    if (!editExpDesc || !editExpAmount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editExpDesc, amount: parseFloat(editExpAmount) })
      });
      if (res.ok) {
        setEditingExpenseId(null);
        fetchExpenses();
      }
    } catch (err) {
      setError('Xərc yenilənmədi');
    } finally {
      setLoading(false);
    }
  }

  async function updatePaymentStatus(id: number, payment_status: 'paid' | 'unpaid') {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status })
      });
      if (res.ok) fetchAllSales();
    } catch (err) {
      setError('Ödəniş statusu yenilənmədi');
    } finally {
      setLoading(false);
    }
  }

  async function updatePaidAmount(id: number, paidAmount: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid_amount: paidAmount }),
      });
      if (res.ok) { fetchAllSales(); setShowPayModal(null); setPayAmount(''); }
    } catch { setError('Ödəniş yenilənmədi'); }
    finally { setLoading(false); }
  }

  async function saveEditedSale(id: number, items: BasketItem[], customer_name: string, customer_phone: string, saleDate: string) {
    setLoading(true);
    const total_amount = items.reduce((a, i) => a + i.price * i.quantity, 0);
    try {
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total_amount, customer_name, customer_phone, date: saleDate }),
      });
      if (res.ok) { fetchAllSales(); setEditingSale(null); setEditSaleItems([]); }
    } catch { setError('Sifariş yenilənmədi'); }
    finally { setLoading(false); }
  }

  async function registerMarket() {
    if (!regMarketName || !regMarketPhone) return;
    setLoading(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      let userName = 'Naməlum';
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `ID: ${u.id}`;
      }
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regMarketName, phone: regMarketPhone,
          lat: regMarketLocation?.lat || null, lon: regMarketLocation?.lon || null,
          tg_user_id: tg?.initDataUnsafe?.user?.id,
          userName: userName
        }),
      });
      if (res.ok) {
        setRegMarketName(''); setRegMarketPhone(''); setRegMarketLocation(null);
        setShowMarketReg(false);
        fetchCustomers();
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch { setError('Market qeydiyyatı uğursuz oldu'); }
    finally { setLoading(false); }
  }

  function getRegLocation() {
    setLocationLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => { setRegMarketLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocationLoading(false); },
      () => { setError('Məkan alına bilmədi'); setLocationLoading(false); }
    );
  }

  async function deleteProduct(id: number) {
    if (!confirm('Bu məhsulu silmək istəyirsiniz?')) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch {
      setError('Silinmədi');
    }
  }

  async function updateSaleStatus(id: number, status: 'pending' | 'delivered') {
    setLoading(true);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id;
      let userName = 'Naməlum';
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `ID: ${u.id}`;
      }
      
      const res = await fetch(`/api/sales/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId, userName })
      });
      if (res.ok) {
        fetchAllSales();
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback?.notificationOccurred) {
          tg.HapticFeedback.notificationOccurred('success');
        }
      }
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSale(id: number) {
    if (!confirm('Bu sifarişi tamamilə silmək istəyirsiniz?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAllSales();
        setSelectedReceipt(null);
      }
    } catch (err) {
      setError('Silinmədi');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    if (!selectedReceipt) return;

    // Yalnız cek divini göstər - başqa hər şeyi gizlət
    const originalOverflow = document.body.style.overflow;
    const allElements = document.querySelectorAll('body *');

    // Hər elementi yoxla və gizlə
    const hiddenElements: { el: Element; display: string; visibility: string }[] = [];
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      const display = htmlEl.style.display;
      const visibility = htmlEl.style.visibility;
      if (htmlEl.style.display !== 'none' && htmlEl.style.visibility !== 'hidden' && !htmlEl.closest('#thermal-receipt')) {
        hiddenElements.push({ el, display, visibility });
        htmlEl.style.display = 'none';
        htmlEl.style.visibility = 'hidden';
      }
    });

    // Cek divini tam görünən et
    const receiptEl = document.getElementById('thermal-receipt');
    if (receiptEl) {
      receiptEl.style.display = 'block';
      receiptEl.style.visibility = 'visible';
      receiptEl.style.position = 'fixed';
      receiptEl.style.left = '0';
      receiptEl.style.top = '0';
      receiptEl.style.width = '100%';
      receiptEl.style.zIndex = '999999';
      receiptEl.style.background = 'white';
    }

    // Çap et
    window.print();

    // Çap bitdikdən sonra hər şeyi bərpa et
    setTimeout(() => {
      hiddenElements.forEach(({ el, display, visibility }) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = display;
        htmlEl.style.visibility = visibility;
      });
      if (receiptEl) {
        receiptEl.style.position = '';
        receiptEl.style.left = '';
        receiptEl.style.top = '';
        receiptEl.style.width = '';
        receiptEl.style.zIndex = '';
        receiptEl.style.background = '';
      }
      document.body.style.overflow = originalOverflow;
    }, 300);
  };

  const addToBasket = (product: Product) => {
    setBasket(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1, gift_quantity: 0 }];
    });
  };

  const removeFromBasket = (productId: number) => {
    setBasket(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateBasketQuantity = (productId: number, delta: number) => {
    setBasket(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const getLocation = () => {
    setLocationLoading(true);
    setError('');
    
    const options = { 
      enableHighAccuracy: true, 
      timeout: 15000, 
      maximumAge: 0 
    };
    
    const success = (pos: GeolocationPosition) => {
      console.log('Location success:', pos.coords.latitude, pos.coords.longitude);
      setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setLocationLoading(false);
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
      }
    };

    const error = (err: any) => {
      console.warn('Location error:', err);
      if (err.code === 3) { // Timeout
         setError('Məkan axtarışı vaxtı keçdi. Yenidən yoxlayın.');
      } else {
         setError('Məkan icazəsi yoxdur və ya GPS bağlıdır.');
      }
      setLocationLoading(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error, options);
    } else {
      setError('Cihaz mütləq GPS dəstəkləməlidir.');
      setLocationLoading(false);
    }
  };

  const getTotal = () => basket.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  async function submitSale() {
    if (!customerName) {
      setError('Müştəri adı mütləqdir!');
      return;
    }

    let finalPhone = customerPhone;
    let finalLocation = location;

    if (!finalPhone || !finalLocation) {
       const existingMarket = uniqueMarkets.find(m => m.name.toLowerCase().trim() === customerName.toLowerCase().trim());
       if (existingMarket) {
           if (!finalPhone) finalPhone = existingMarket.phone || '';
           if (!finalLocation && existingMarket.lat && existingMarket.lon) {
               finalLocation = { lat: existingMarket.lat, lon: existingMarket.lon };
           }
       }
    }

    if (!finalPhone) {
      setError('Müştəri telefonu mütləqdir!');
      return;
    }
    if (!finalLocation) {
      setError('Məkan (Lokasiya) mütləqdir! Zəhmət olmasa lokasiyanı əlavə edin.');
      return;
    }
    setLoading(true);
    const totalGiftQuantity = basket.reduce((acc, item) => acc + (Number(item.gift_quantity) || 0), 0);
    try {
      const tg = (window as any).Telegram?.WebApp;
      let userName = 'Naməlum';
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        userName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `ID: ${u.id}`;
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date, customer_name: customerName, customer_phone: finalPhone,
          latitude: finalLocation?.lat || null, longitude: finalLocation?.lon || null,
          items: basket, gift_quantity: totalGiftQuantity,
          tg_user_id: tg?.initDataUnsafe?.user?.id,
          userName: userName
        })
      });
      if (!res.ok) throw new Error('Xəta');
      const data = await res.json();
      const finalResult = { ...data, customerName, customerPhone, basket, date, total: getTotal(), gift_quantity: totalGiftQuantity };
      setResult(finalResult);
      setShowResult(true);
      fetchAllSales(); // Refresh counts
      if (tg?.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      if (tg && data.sale_text) setTimeout(() => tg.sendData(data.sale_text), 1500);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  if (!sdkReady || authLoading) return <div className="min-h-screen bg-white flex items-center justify-center p-20 text-center">Yüklənir...</div>;
  if (isAuthorized === false) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-10 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl space-y-4">
        <span className="text-5xl block">🚫</span>
        <h2 className="text-xl font-bold">Giriş Qadağandır</h2>
        <p className="font-mono text-orange-500">{(window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id || 'Dev'}</p>
      </div>
    </div>
  );

  const bg = darkMode ? 'bg-[#0f0f1a]' : 'bg-white';
  const text = darkMode ? 'text-white' : 'text-gray-900';
  const cardBg = darkMode ? 'bg-[#1a1a2e]' : 'bg-[#f8f9fa]';
  const border = darkMode ? 'border-[#2d2d44]' : 'border-gray-100';
  const inputBg = darkMode ? 'bg-[#252540]' : 'bg-white';

  const tg = (window as any).Telegram?.WebApp;
  const currentUserId = tg?.initDataUnsafe?.user?.id;
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = allSales.filter(s => s.expert_id === currentUserId && s.created_at.startsWith(today)).length;
  const todaySalesTotal = allSales
    .filter(s => s.expert_id === currentUserId && s.created_at.startsWith(today))
    .reduce((acc, s) => acc + s.total_amount, 0);
  
  const todayDeliveriesCount = allSales
    .filter(s => s.courier_id === currentUserId && s.status === 'delivered' && s.created_at.startsWith(today)).length;

  // Analytics helper
  const totalIncome = allSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalIncome - totalExpense;

  // Route Optimization Link
  const pendingSales = allSales.filter(s => (!s.status || s.status === 'pending') && s.latitude);
  const mapUrl = pendingSales.length > 0 
    ? `https://www.google.com/maps/dir/${pendingSales.map(s => `${s.latitude},${s.longitude}`).join('/')}`
    : '#';

  return (
    <main className={`min-h-screen ${bg} ${text} font-sans`}>
      <div className="max-w-md mx-auto p-6 pb-32">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">🍞</div>
            <h1 className="text-xl font-black">Laçın Satış</h1>
          </div>
          {isActualAdmin && (
            <select 
              value={role || ''} 
              onChange={(e) => setRole(e.target.value as any)}
              className={`text-[10px] font-bold uppercase bg-transparent border ${border} rounded-full px-3 py-1 outline-none ${text}`}
            >
              <option value="admin">Admin</option>
              <option value="courier">Kuryer</option>
              <option value="expeditor">Ekspeditor</option>
            </select>
          )}
        </header>

        {/* --- ADMIN VIEW --- */}
        {role === 'admin' && (
          <div className="space-y-6">
            {/* Date range filter */}
            <div className={`${cardBg} p-3 rounded-2xl border ${border} flex items-center gap-2 text-[11px]`}>
              <span className="font-bold text-gray-400 whitespace-nowrap">📅 Tarix:</span>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={`flex-1 p-1.5 rounded-xl ${inputBg} border border-gray-200 outline-none focus:border-orange-500 text-[11px]`} />
              <span className="text-gray-400">—</span>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={`flex-1 p-1.5 rounded-xl ${inputBg} border border-gray-200 outline-none focus:border-orange-500 text-[11px]`} />
              {(filterFrom || filterTo) && (
                <button onClick={() => { setFilterFrom(''); setFilterTo(''); }} className="text-orange-500 font-bold px-2">✕</button>
              )}
            </div>

            <div className="flex overflow-x-auto space-x-2 bg-black/5 p-1 rounded-2xl no-scrollbar">
              <button onClick={() => setActiveTab('sales')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'sales' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Sifarişlər</button>
              <button onClick={() => setActiveTab('products')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'products' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Məhsullar</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'stats' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Statistika</button>
              <button onClick={() => setActiveTab('reports')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'reports' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Hesabatlar</button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'expenses' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Xərclər</button>
              <button onClick={() => setActiveTab('customers')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'customers' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Müştərilər</button>
            </div>

            {activeTab === 'sales' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Sifarişlər</h3>
                  <span className="text-[10px] text-gray-400">{filteredSales.length} nəticə</span>
                </div>
                {filteredSales.map(s => {
                  const debt = getSaleDebt(s);
                  return (
                  <div key={s.id} className={`${cardBg} rounded-3xl border ${border} shadow-sm overflow-hidden`}>
                    <div onClick={() => setExpandedSaleId(expandedSaleId === s.id ? null : s.id)} className="p-5 flex justify-between items-center cursor-pointer">
                      <div>
                        <p className="font-bold">#{s.id} - {s.customer_name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right flex flex-col items-end space-y-1">
                        <p className="font-bold">{s.total_amount.toFixed(2)} ₼</p>
                        {debt > 0 && <p className="text-[9px] font-black text-red-500">Borc: {debt.toFixed(2)} ₼</p>}
                        <div className="flex gap-1">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${s.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {s.status === 'delivered' ? 'Çatdırıldı' : 'Gözləyir'}
                          </span>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${s.payment_status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {s.payment_status === 'paid' ? 'Ödəndi' : 'Ödənmədi'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {expandedSaleId === s.id && (
                      <div className="px-5 pb-5 pt-2 border-t border-black/5 bg-black/5 space-y-3">
                        <div className="text-[11px] space-y-1">
                          <p className="font-bold text-gray-500 uppercase text-[9px]">Sifariş Detalları:</p>
                          {s.items?.map((item, idx) => (
                            <p key={idx} className="flex justify-between">
                              <span>• {item.name}</span>
                              <span className="font-bold">{item.quantity} əd {item.gift_quantity ? `(+${item.gift_quantity}🎁)` : ''}</span>
                            </p>
                          ))}
                        </div>

                        {/* Payment breakdown */}
                        <div className="pt-2 border-t border-black/5 space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ödənildi:</span>
                            <span className="font-bold text-green-600">{(s.paid_amount || 0).toFixed(2)} ₼</span>
                          </div>
                          {debt > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Borc:</span>
                              <span className="font-bold text-red-500">{debt.toFixed(2)} ₼</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-black/5 flex justify-between text-[11px]">
                          <span className="text-gray-400">Ekspeditor:</span>
                          <span className="font-bold">{s.expert_name || s.expert_id || 'Naməlum'}</span>
                        </div>
                        {s.courier_name && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400">Kuryer:</span>
                            <span className="font-bold text-green-600">{s.courier_name}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowPayModal({ id: s.id, total: s.total_amount, paid: s.paid_amount || 0 }); setPayAmount(''); }}
                            className="py-2 bg-blue-500 text-white rounded-xl text-[10px] font-bold active:scale-95"
                          >
                            💳 Ödəniş Yaz
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingSale(s); setEditSaleItems(s.items ? s.items.map(i => ({ ...i })) : []); setEditSaleCustomer(s.customer_name); setEditSalePhone(s.customer_phone); setEditSaleDate(s.date || s.created_at?.split('T')[0] || ''); }}
                            className="py-2 bg-purple-500/10 text-purple-600 rounded-xl text-[10px] font-bold border border-purple-500/20 active:scale-95"
                          >
                            ✏️ Redaktə Et
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); updatePaymentStatus(s.id, s.payment_status === 'paid' ? 'unpaid' : 'paid'); }}
                            className={`w-full py-2 text-white rounded-xl text-[10px] font-bold active:scale-95 ${s.payment_status === 'paid' ? 'bg-red-500' : 'bg-green-500'}`}
                          >
                            {s.payment_status === 'paid' ? '❌ Ödənişi Ləğv Et' : '✅ Tam Ödənildi'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedReceipt(s); }}
                            className="w-full py-2 bg-orange-500/10 text-orange-500 rounded-xl text-[10px] font-bold border border-orange-500/20 active:scale-95"
                          >
                            🧾 Çek
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">

                {/* ── KPI kartları ── */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${cardBg} p-4 rounded-3xl border border-green-500/20 shadow-lg`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Satış (Seçili)</p>
                    <p className="text-lg font-black text-green-500">{filteredSales.reduce((a, s) => a + s.total_amount, 0).toFixed(2)} ₼</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-blue-500/20 shadow-lg`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ödənildi</p>
                    <p className="text-lg font-black text-blue-500">{filteredSales.reduce((a, s) => a + (s.paid_amount || 0), 0).toFixed(2)} ₼</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-red-500/20 shadow-lg`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ümumi Borc</p>
                    <p className="text-lg font-black text-red-500">{filteredSales.reduce((a, s) => a + getSaleDebt(s), 0).toFixed(2)} ₼</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-purple-500/20 shadow-lg`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Xalis Mənfəət</p>
                    <p className="text-lg font-black text-purple-500">{(filteredSales.reduce((a, s) => a + s.total_amount, 0) - expenses.reduce((a, e) => a + e.amount, 0)).toFixed(2)} ₼</p>
                  </div>
                </div>

                {/* ── Hədiyyə/Bonus Hesabatı ── */}
                <div className={`${cardBg} p-5 rounded-3xl border border-green-500/20 shadow-lg space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">🎁 Hədiyyə/Bonus Hesabatı</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-2xl p-3 text-center">
                      <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Cəmi Miqdar</p>
                      <p className="text-2xl font-black text-green-600">{giftStats.totalQty} <span className="text-sm">əd</span></p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-3 text-center">
                      <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Cəmi Dəyər</p>
                      <p className="text-2xl font-black text-green-600">{giftStats.totalValue.toFixed(2)} <span className="text-sm">₼</span></p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {products.map(p => {
                      const gq = filteredSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + (Number(i.gift_quantity) || 0), 0) || 0), 0);
                      if (!gq) return null;
                      return (
                        <div key={p.id} className="flex justify-between text-xs font-bold">
                          <span className="text-gray-600">• {p.name}</span>
                          <span className="text-green-600">{gq} əd (+{(gq * p.price).toFixed(2)} ₼)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Ödəmiş / Borclu Müştərilər ── */}
                <div className={`${cardBg} p-5 rounded-3xl border border-red-500/20 space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-500">💸 Borclu Müştərilər</h3>
                  {Object.keys(debtorMap).length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">Borclu müştəri yoxdur 🎉</p>
                    : Object.entries(debtorMap).sort(([, a], [, b]) => b - a).map(([name, debt]) => (
                      <div key={name} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{name}</span>
                        <span className="font-black text-red-500">{debt.toFixed(2)} ₼</span>
                      </div>
                    ))}
                </div>

                <div className={`${cardBg} p-5 rounded-3xl border border-blue-500/20 space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500">✅ Ödəmiş Müştərilər</h3>
                  {filteredSales.filter(s => s.payment_status === 'paid').length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">Ödəmiş sifariş yoxdur</p>
                    : [...new Map(filteredSales.filter(s => s.payment_status === 'paid').map(s => [s.customer_name, s])).values()].map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{s.customer_name}</span>
                        <span className="text-[10px] text-gray-400">{s.date}</span>
                      </div>
                    ))}
                </div>

                {/* ── Günlük Satış Diaqramı ── */}
                {salesByDayEntries.length > 0 && (
                  <div className={`${cardBg} p-5 rounded-3xl border ${border} space-y-3`}>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">📊 Günlük Satış</h3>
                    {salesByDayEntries.map(([day, total]) => (
                      <div key={day} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-500">{day}</span>
                          <span className="text-orange-500">{total.toFixed(2)} ₼</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (total / maxDayTotal) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Məhsul Statistikası ── */}
                <div className={`${cardBg} p-5 rounded-3xl border ${border} space-y-4`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Məhsul Statistikası</h3>
                  {products.map(p => {
                    const count = filteredSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + i.quantity, 0) || 0), 0);
                    const giftCount = filteredSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + (Number(i.gift_quantity) || 0), 0) || 0), 0);
                    if (!count && !giftCount) return null;
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{p.name}</span>
                          <span>{count} əd {giftCount > 0 && <span className="text-green-500">(+{giftCount}🎁)</span>}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{ width: `${Math.min(100, (count / (filteredSales.length || 1)) * 20)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* Summary KPI cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`${cardBg} p-4 rounded-3xl border border-green-500/20`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ümumi Satış</p>
                    <p className="text-lg font-black text-green-500">{filteredSales.reduce((a, s) => a + s.total_amount, 0).toFixed(2)} ₼</p>
                    <p className="text-[9px] text-gray-400 mt-1">{filteredSales.length} sifariş</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-blue-500/20`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Ödənilmiş</p>
                    <p className="text-lg font-black text-blue-500">{filteredSales.reduce((a, s) => a + (s.paid_amount || 0), 0).toFixed(2)} ₼</p>
                    <p className="text-[9px] text-gray-400 mt-1">{filteredSales.filter(s => s.payment_status === 'paid').length} ödəndi</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-red-500/20`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Borc</p>
                    <p className="text-lg font-black text-red-500">{filteredSales.reduce((a, s) => a + getSaleDebt(s), 0).toFixed(2)} ₼</p>
                    <p className="text-[9px] text-gray-400 mt-1">{Object.keys(debtorMap).length} müştəri</p>
                  </div>
                  <div className={`${cardBg} p-4 rounded-3xl border border-purple-500/20`}>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Hədiyyə Dəyəri</p>
                    <p className="text-lg font-black text-purple-500">{giftStats.totalValue.toFixed(2)} ₼</p>
                    <p className="text-[9px] text-gray-400 mt-1">{giftStats.totalQty} əd</p>
                  </div>
                </div>

                {/* Daily sales bar */}
                {salesByDayEntries.length > 0 && (
                  <div className={`${cardBg} p-5 rounded-3xl border ${border} space-y-3`}>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">📊 Günlük Satış</h3>
                    {salesByDayEntries.slice(-14).reverse().map(([day, total]) => (
                      <div key={day} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-500">{day}</span>
                          <span className="text-orange-500">{total.toFixed(2)} ₼</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${Math.min(100, (total / maxDayTotal) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Debtors */}
                <div className={`${cardBg} p-5 rounded-3xl border border-red-500/20 space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-500">💸 Borclu Müştərilər</h3>
                  {Object.keys(debtorMap).length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">Borclu müştəri yoxdur 🎉</p>
                    : Object.entries(debtorMap).sort(([, a], [, b]) => b - a).map(([name, debt]) => (
                      <div key={name} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{name}</span>
                        <span className="font-black text-red-500">{debt.toFixed(2)} ₼</span>
                      </div>
                    ))}
                </div>

                {/* Paid customers */}
                <div className={`${cardBg} p-5 rounded-3xl border border-blue-500/20 space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-500">✅ Ödəmiş Müştərilər</h3>
                  {filteredSales.filter(s => s.payment_status === 'paid').length === 0
                    ? <p className="text-xs text-gray-400 text-center py-4">Ödəmiş sifariş yoxdur</p>
                    : [...new Map(filteredSales.filter(s => s.payment_status === 'paid').map(s => [s.customer_name, s])).values()].map(s => (
                      <div key={s.id} className="flex justify-between items-center text-sm">
                        <span className="font-bold">{s.customer_name}</span>
                        <span className="text-green-600 font-bold">{s.total_amount.toFixed(2)} ₼</span>
                      </div>
                    ))}
                </div>

                {/* Per-product gift breakdown */}
                <div className={`${cardBg} p-5 rounded-3xl border border-purple-500/20 space-y-3`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-purple-600">🎁 Hədiyyə Hesabatı (Məhsul üzrə)</h3>
                  {products.map(p => {
                    const gq = filteredSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + (Number(i.gift_quantity) || 0), 0) || 0), 0);
                    if (!gq) return null;
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-600">{p.name}</span>
                        <span className="text-purple-600">{gq} əd = {(gq * p.price).toFixed(2)} ₼</span>
                      </div>
                    );
                  })}
                  {products.every(p => filteredSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + (Number(i.gift_quantity) || 0), 0) || 0), 0) === 0) && (
                    <p className="text-xs text-gray-400 text-center py-4">Bu dövrdə hədiyyə yoxdur</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="space-y-6">
                <div className={`${cardBg} p-6 rounded-3xl border ${border} shadow-xl space-y-4`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Xərc Əlavə Et</h3>
                  <input value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} placeholder="Xərcin təsviri" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
                  <input value={newExpAmount} onChange={e => setNewExpAmount(e.target.value)} placeholder="Məbləğ (₼)" type="number" step="0.01" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
                  <button onClick={addExpense} disabled={loading} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition">Xərci Yaz</button>
                </div>
                <div className="space-y-3">
                  {expenses.map(e => (
                    <div key={e.id} className={`${cardBg} p-4 rounded-3xl border ${border} flex flex-col space-y-2`}>
                      {editingExpenseId === e.id ? (
                        <div className="space-y-2">
                           <input value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} className={`w-full p-2 rounded-xl ${inputBg} border-2 border-transparent focus:border-orange-500 text-sm`} />
                           <input value={editExpAmount} onChange={ev => setEditExpAmount(ev.target.value)} type="number" step="0.01" className={`w-full p-2 rounded-xl ${inputBg} border-2 border-transparent focus:border-orange-500 text-sm`} />
                           <div className="flex space-x-2">
                             <button onClick={() => updateExpense(e.id)} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold active:scale-95">Yadda Saxla</button>
                             <button onClick={() => setEditingExpenseId(null)} className="flex-1 bg-gray-500 text-white py-2 rounded-xl text-xs font-bold active:scale-95">Ləğv Et</button>
                           </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center w-full">
                          <div className="flex-1">
                            <p className="font-bold">{e.description}</p>
                            <p className="text-[10px] text-gray-400">{e.date}</p>
                          </div>
                          <div className="text-right flex items-center space-x-2">
                            <p className="text-sm font-black text-red-500">-{e.amount.toFixed(2)} ₼</p>
                            <button onClick={() => { setEditingExpenseId(e.id); setEditExpDesc(e.description); setEditExpAmount(e.amount.toString()); }} className="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xs active:scale-95">✏️</button>
                            <button onClick={() => deleteExpense(e.id)} className="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs active:scale-95">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div className="space-y-6">
                <div className={`${cardBg} p-5 rounded-3xl border ${border} space-y-3`}>
                  <h3 className="font-bold text-sm">Yeni Müştəri</h3>
                  <input type="text" placeholder="Müştəri/Market Adı" value={newCustName} onChange={e => setNewCustName(e.target.value)} className={`w-full p-3 rounded-xl ${inputBg} border-2 border-transparent focus:border-orange-500`} />
                  <input type="tel" placeholder="Nömrə (məs: 0501234567)" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} className={`w-full p-3 rounded-xl ${inputBg} border-2 border-transparent focus:border-orange-500`} />
                  <button onClick={addCustomer} disabled={loading} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50">Müştəri Əlavə Et</button>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Müştəri Bazası</h3>
                  {uniqueMarkets.map((m, idx) => {
                    const manualCust = customers.find(c => c.name.toLowerCase().trim() === m.name.toLowerCase().trim());
                    const custId = manualCust ? manualCust.id : null;
                    return (
                      <div key={idx} className={`${cardBg} p-4 rounded-3xl border ${border} flex justify-between items-center`}>
                        <div>
                          <p className="font-bold">{m.name}</p>
                          <p className="text-xs text-gray-400">{m.phone || 'Nömrə yoxdur'}</p>
                        </div>
                        {manualCust && custId && (
                          <button onClick={() => deleteCustomer(custId)} className="w-8 h-8 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs active:scale-95">✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className={`${cardBg} p-6 rounded-3xl border ${border} shadow-xl space-y-4`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Məhsul Əlavə Et</h3>
                  <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Məhsul adı" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
                  <input value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} placeholder="Qiymət" type="number" step="0.01" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
                  <button onClick={addProduct} disabled={loading} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition">Əlavə Et</button>
                </div>
                <div className="space-y-3">
                  {products.map(p => (
                    <div key={p.id} className={`${cardBg} p-4 rounded-3xl border ${border} flex justify-between items-center`}>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-orange-500 font-black">{p.price.toFixed(2)} ₼</p>
                      </div>
                      <button onClick={() => deleteProduct(p.id)} className="text-red-500 text-xs p-2">Sil</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- COURIER VIEW --- */}
        {role === 'courier' && (
          <div className="space-y-6">
            <div className="flex space-x-2 bg-black/5 p-1 rounded-2xl">
              <button onClick={() => setActiveTab('sales')} className={`flex-1 py-2 rounded-xl font-bold text-xs ${activeTab === 'sales' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Sifarişlər</button>
              <button onClick={() => setActiveTab('map')} className={`flex-1 py-2 rounded-xl font-bold text-xs ${activeTab === 'map' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Marşrut (📍 {pendingSales.length})</button>
            </div>

            {activeTab === 'sales' && (
              <>
                <div className={`${cardBg} p-6 rounded-3xl border-2 border-green-500/10 shadow-lg flex justify-between items-center`}>
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Bugünkü Çatdırılma</h3>
                    <p className="text-3xl font-black text-green-500">{todayDeliveriesCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-2xl text-green-500">🚚</div>
                </div>

                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Gözləyən Sifarişlər</h3>
                {allSales.filter(s => !s.status || s.status === 'pending').map(s => (
                  <div key={s.id} className={`${cardBg} rounded-3xl border ${border} shadow-lg overflow-hidden`}>
                    <div onClick={() => setExpandedSaleId(expandedSaleId === s.id ? null : s.id)} className="p-6 flex justify-between items-center cursor-pointer">
                      <div>
                        <p className="text-xl font-bold">#{s.id} - {s.customer_name}</p>
                        <p className="text-xs text-gray-400">{new Date(s.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {expandedSaleId === s.id && (
                      <div className="px-6 pb-6 space-y-4">
                        <div className={`p-4 rounded-2xl ${inputBg} space-y-3`}>
                          <p className="text-sm font-bold">📱 {s.customer_phone}</p>
                          {s.items?.map((item, idx) => <p key={idx} className="text-xs">• {item.name}: {item.quantity} ədəd</p>)}
                        </div>
                        <button onClick={() => updateSaleStatus(s.id, 'delivered')} className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold">✅ Çatdırıldı</button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {activeTab === 'map' && (
              <div className="space-y-6">
                <div className={`${cardBg} p-6 rounded-3xl border ${border} shadow-xl text-center space-y-4`}>
                  <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-4xl mx-auto">🗺️</div>
                  <h2 className="text-xl font-black">Ağıllı Marşrut</h2>
                  <p className="text-xs text-gray-400">Bütün gözləyən ({pendingSales.length}) sifarişləri vahid xəritədə ardıcıl görmək üçün aşağıdakı düyməni sıxın.</p>
                  <a 
                    href={mapUrl} 
                    target="_blank" 
                    className={`block w-full py-5 rounded-2xl font-black text-white shadow-xl transition active:scale-95 ${pendingSales.length > 0 ? 'bg-blue-500 shadow-blue-500/20' : 'bg-gray-300 pointer-events-none'}`}
                  >
                    🚀 Marşrutu Başlat
                  </a>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Sıralama (Müştərilər)</h3>
                  {pendingSales.map((s, idx) => (
                    <div key={s.id} className={`${cardBg} p-4 rounded-2xl border ${border} flex items-center space-x-4`}>
                      <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{s.customer_name}</p>
                        <p className="text-[10px] text-gray-400">ID: #{s.id}</p>
                      </div>
                      <a href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`} target="_blank" className="text-blue-500 text-xs font-bold">Bax 📍</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- EXPEDITOR VIEW --- */}
        {role === 'expeditor' && !showResult && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-3">
              <div className={`${cardBg} p-5 rounded-3xl border-2 border-orange-500/10 shadow-lg`}>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bugünkü Sifariş</h3>
                <p className="text-3xl font-black text-orange-500">{todayOrders}</p>
              </div>
              <button
                onClick={() => setShowMarketReg(true)}
                className={`${cardBg} p-5 rounded-3xl border-2 border-blue-500/20 shadow-lg text-left active:scale-95`}
              >
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Yeni Market</p>
                <p className="text-3xl">🏪</p>
              </button>
              <button
                onClick={() => setShowDebtPanel(!showDebtPanel)}
                className={`col-span-2 ${cardBg} p-4 rounded-3xl border-2 border-red-500/20 shadow-lg text-left active:scale-95 flex items-center justify-between`}
              >
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Borclar</p>
                  <p className="text-sm font-bold text-red-500">
                    {(() => {
                      const debtMap: Record<string, { debt: number; saleId: number }[]> = {};
                      allSales.forEach(s => {
                        const paid = s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0);
                        const debt = s.total_amount - paid;
                        if (debt > 0) {
                          if (!debtMap[s.customer_name]) debtMap[s.customer_name] = [];
                          debtMap[s.customer_name].push({ debt, saleId: s.id });
                        }
                      });
                      const count = Object.keys(debtMap).length;
                      return count > 0 ? `${count} müştəri borcludur` : 'Borc yoxdur';
                    })()}
                  </p>
                </div>
                <span className="text-xl">{showDebtPanel ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Debt payment panel */}
            {showDebtPanel && (() => {
              const debtors: { name: string; phone: string; sales: { id: number; total: number; paid: number; debt: number; date: string }[] }[] = [];
              allSales.forEach(s => {
                const paid = s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0);
                const debt = s.total_amount - paid;
                if (debt > 0) {
                  let entry = debtors.find(d => d.name === s.customer_name);
                  if (!entry) {
                    entry = { name: s.customer_name, phone: s.customer_phone || '', sales: [] };
                    debtors.push(entry);
                  }
                  entry.sales.push({ id: s.id, total: s.total_amount, paid, debt, date: (s.date || s.created_at || '').slice(0, 10) });
                }
              });

              if (debtors.length === 0) {
                return (
                  <div className={`${cardBg} p-5 rounded-3xl border ${border} text-center`}>
                    <p className="text-green-500 font-bold">✅ Bütün ödənişlər tamamlanıb</p>
                  </div>
                );
              }

              return (
                <div className={`${cardBg} p-4 rounded-3xl border-2 border-red-500/20 shadow-xl space-y-3`}>
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest">💳 Borc Ödənişi</h3>
                  {debtors.map(d => (
                    <div key={d.name} className={`rounded-2xl border ${border} overflow-hidden`}>
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{d.name}</p>
                          {d.phone && <p className="text-xs text-gray-400">{d.phone}</p>}
                        </div>
                        <p className="font-black text-red-500 text-sm">
                          {d.sales.reduce((a, s) => a + s.debt, 0).toFixed(2)} ₼ borc
                        </p>
                      </div>
                      <div className="border-t border-black/5 space-y-0">
                        {d.sales.map(s => (
                          <div key={s.id} className="px-4 py-2 flex items-center gap-2 border-b border-black/5 last:border-0">
                            <div className="flex-1 text-xs text-gray-500">
                              <span>{s.date}</span>
                              <span className="ml-2 text-red-400 font-semibold">{s.debt.toFixed(2)} ₼</span>
                            </div>
                            {debtPaySaleId === s.id ? (
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <input
                                  type="number"
                                  value={debtPayAmount}
                                  onChange={e => setDebtPayAmount(e.target.value)}
                                  placeholder="Məbləğ"
                                  min="0.01"
                                  max={s.debt}
                                  step="0.01"
                                  className={`w-20 px-2 py-1 rounded-lg text-xs border-2 border-orange-500 ${inputBg} outline-none`}
                                  autoFocus
                                />
                                <button
                                  disabled={debtPayLoading || !debtPayAmount}
                                  onClick={async () => {
                                    setDebtPayLoading(true);
                                    const newPaid = s.paid + parseFloat(debtPayAmount);
                                    await fetch(`/api/sales/${s.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ paid_amount: Math.min(newPaid, s.total) }),
                                    });
                                    const fresh = await fetch('/api/sales').then(r => r.json());
                                    setAllSales(Array.isArray(fresh) ? fresh : []);
                                    setDebtPaySaleId(null);
                                    setDebtPayAmount('');
                                    setDebtPayLoading(false);
                                  }}
                                  className="px-2 py-1 bg-green-500 text-white text-xs rounded-lg font-bold active:scale-95 disabled:opacity-40"
                                >
                                  ✓
                                </button>
                                <button onClick={() => { setDebtPaySaleId(null); setDebtPayAmount(''); }}
                                  className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg font-bold">
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  disabled={debtPayLoading}
                                  onClick={async () => {
                                    setDebtPayLoading(true);
                                    await fetch(`/api/sales/${s.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ paid_amount: s.total }),
                                    });
                                    const fresh = await fetch('/api/sales').then(r => r.json());
                                    setAllSales(Array.isArray(fresh) ? fresh : []);
                                    setDebtPayLoading(false);
                                  }}
                                  className="text-xs font-bold text-green-600 active:scale-95 px-2 py-1 bg-green-500/10 rounded-lg disabled:opacity-40"
                                >
                                  ✅ Tam
                                </button>
                                <button
                                  onClick={() => { setDebtPaySaleId(s.id); setDebtPayAmount(s.debt.toFixed(2)); }}
                                  className="text-xs font-bold text-orange-500 active:scale-95 px-2 py-1 bg-orange-500/10 rounded-lg"
                                >
                                  Qismən
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Market registration overlay */}
            {showMarketReg && (
              <div className={`${cardBg} p-5 rounded-3xl border-2 border-blue-500/30 shadow-xl space-y-3`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-blue-600">🏪 Yeni Market Qeydiyyatı</h3>
                  <button onClick={() => setShowMarketReg(false)} className="text-gray-400 text-lg">✕</button>
                </div>
                <input
                  type="text"
                  placeholder="Market adı"
                  value={regMarketName}
                  onChange={e => setRegMarketName(e.target.value)}
                  className={`w-full p-3 rounded-xl ${inputBg} border-2 border-transparent focus:border-blue-500 outline-none`}
                />
                <input
                  type="tel"
                  placeholder="Telefon nömrəsi"
                  value={regMarketPhone}
                  onChange={e => setRegMarketPhone(e.target.value)}
                  className={`w-full p-3 rounded-xl ${inputBg} border-2 border-transparent focus:border-blue-500 outline-none`}
                />
                <button
                  onClick={getRegLocation}
                  className={`w-full p-3 rounded-xl ${inputBg} text-sm font-bold text-gray-400 border-2 border-dashed ${border}`}
                >
                  {locationLoading ? '🔄 Məkan axtarılır...' : regMarketLocation ? `📍 ${regMarketLocation.lat.toFixed(4)}, ${regMarketLocation.lon.toFixed(4)}` : '📍 Lokasiya Əlavə Et (Opsional)'}
                </button>
                <button
                  onClick={registerMarket}
                  disabled={loading || !regMarketName || !regMarketPhone}
                  className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold text-sm active:scale-95 disabled:opacity-40"
                >
                  {loading ? 'Gözləyin...' : '✅ Qeydiyyatı Tamamla'}
                </button>
              </div>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 ml-1">Məhsullar</h3>

              {/* Search */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl ${inputBg} border-2 border-transparent focus-within:border-orange-500 transition-all`}>
                <span className="text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Məhsul axtar..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                {productSearch && (
                  <button onClick={() => setProductSearch('')} className="text-gray-400 text-xs font-bold px-1">✕</button>
                )}
              </div>

              {/* Grid: top 4 by default, all when searching */}
              {(() => {
                const soldMap: Record<number, number> = {};
                allSales.forEach(s => s.items?.forEach(i => { soldMap[i.product_id] = (soldMap[i.product_id] || 0) + i.quantity; }));
                const displayed = productSearch
                  ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  : [...products].sort((a, b) => (soldMap[b.id] || 0) - (soldMap[a.id] || 0)).slice(0, 4);
                return (
                  <div className="grid grid-cols-2 gap-3">
                    {displayed.map(p => (
                      <button key={p.id} onClick={() => addToBasket(p)} className={`${cardBg} p-3 rounded-2xl border ${border} flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm min-h-[80px]`}>
                        <span className="text-xs font-bold leading-tight mb-1 text-center">{p.name}</span>
                        <span className="text-[10px] font-black text-orange-500">{p.price.toFixed(2)} ₼</span>
                      </button>
                    ))}
                    {productSearch && displayed.length === 0 && (
                      <div className="col-span-2 text-center text-xs text-gray-400 py-6">Heç bir məhsul tapılmadı</div>
                    )}
                  </div>
                );
              })()}
            </section>

            {basket.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 ml-1">Səbət</h3>
                <div className="space-y-3">
                  {basket.map(item => (
                    <div key={item.product_id} className={`${cardBg} p-4 rounded-3xl border-2 border-orange-500/20 shadow-md space-y-3`}>
                      <div className="flex justify-between items-center">
                        <p className="font-bold">{item.name}</p>
                        <button onClick={() => removeFromBasket(item.product_id)} className="text-red-500 text-sm">Sil</button>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Satış Sayı</p>
                          <div className="flex items-center space-x-2 bg-white/50 rounded-xl p-1 border border-gray-100">
                            <button onClick={() => updateBasketQuantity(item.product_id, -1)} className="w-6 h-6 rounded-full bg-gray-100 font-bold">-</button>
                            <input type="number" value={item.quantity} onChange={(e) => setBasket(prev => prev.map(b => b.product_id === item.product_id ? { ...b, quantity: parseInt(e.target.value) || 0 } : b))} className="font-black w-10 text-center bg-transparent outline-none text-xs" />
                            <button onClick={() => updateBasketQuantity(item.product_id, 1)} className="w-6 h-6 rounded-full bg-gray-100 font-bold">+</button>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[10px] font-bold text-green-500 uppercase">🎁 Hədiyyə</p>
                          <input type="number" placeholder="0" value={item.gift_quantity || ''} onChange={(e) => setBasket(prev => prev.map(b => b.product_id === item.product_id ? { ...b, gift_quantity: parseInt(e.target.value) || 0 } : b))} className="w-full p-2 bg-green-50/50 rounded-xl border border-green-100 font-black text-center text-xs outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className={`${cardBg} p-6 rounded-3xl border ${border} shadow-xl space-y-4`}>
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <input 
                  value={customerName} 
                  onChange={e => { setCustomerName(e.target.value); setShowMarketList(true); }} 
                  onFocus={() => setShowMarketList(true)}
                  autoComplete="off"
                  placeholder="Müştəri adı" 
                  className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} 
                />
                {showMarketList && uniqueMarkets.filter(m => m.name.toLowerCase().includes(customerName.toLowerCase())).length > 0 && (
                  <div className={`absolute z-[100] left-0 right-0 mt-2 ${cardBg} border ${border} rounded-2xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden`}>
                    <div className="p-2 border-b border-black/5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Yaddaşdan seçin:</div>
                    {uniqueMarkets.filter(m => m.name.toLowerCase().includes(customerName.toLowerCase())).map((m, idx) => (
                      <div 
                        key={idx} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerName(m.name);
                          setCustomerPhone(m.phone || '');
                          if (m.lat && m.lon) setLocation({ lat: m.lat, lon: m.lon });
                          setShowMarketList(false);
                        }}
                        className="p-4 border-b border-black/5 last:border-0 active:bg-orange-500 active:text-white cursor-pointer hover:bg-black/5"
                      >
                        <p className="font-bold text-sm text-orange-500">{m.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-[10px] opacity-60 font-mono">{m.phone || 'Nömrə yoxdur'}</p>
                          {m.lat && <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold">📍 Lokasiya var</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Telefon" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
              <button onClick={getLocation} className={`w-full p-4 rounded-2xl ${inputBg} text-sm font-bold text-gray-400 border-2 border-dashed ${border}`}>
                {locationLoading ? '🔄 Məkan axtarılır...' : location ? `📍 ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : '📍 Lokasiya Əlavə Et'}
              </button>
            </section>

            <div className={`fixed bottom-0 left-0 right-0 p-6 ${bg} border-t ${border} backdrop-blur-lg bg-opacity-90 z-50`}>
              <div className="max-w-md mx-auto flex justify-between items-center">
                <p className="text-2xl font-black text-orange-500">{getTotal().toFixed(2)} ₼</p>
                <button onClick={submitSale} disabled={loading} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 disabled:opacity-30">
                  {loading ? 'Gözləyin...' : 'Sifarişi Bitir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showResult && (
          <div className="text-center py-10 space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-5xl mx-auto shadow-2xl shadow-green-500/30">✅</div>
            <h2 className="text-3xl font-black">Uğurlu!</h2>
            
            <div className={`${cardBg} p-6 rounded-3xl border ${border} text-left space-y-4 shadow-xl`}>
              <div className="flex justify-between items-center border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-gray-400 uppercase">Sifariş Çeki</span>
                <span className="text-xs font-mono font-bold">#{result?.id}</span>
              </div>
              <div className="space-y-2">
                {result?.basket?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {item.name} x {item.quantity}
                      <span className="text-[10px] text-gray-400 ml-1">({item.price.toFixed(2)} ₼)</span>
                    </span>
                    <span className="font-bold">{(item.price * item.quantity).toFixed(2)} ₼</span>
                  </div>
                ))}
                {result?.gift_quantity > 0 && <p className="text-xs text-green-500 font-bold">🎁 Hədiyyə: {result.gift_quantity} ədəd</p>}
              </div>
              <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                <span className="font-bold">Cəmi:</span>
                <span className="text-xl font-black text-orange-500">{result?.total?.toFixed(2)} ₼</span>
              </div>
              <div className="text-[10px] text-gray-400 pt-2 space-y-1">
                <p>👤 Müştəri: {result?.customerName}</p>
                <p>📱 Telefon: {result?.customerPhone}</p>
                <p>📅 Tarix: {result?.date}</p>
              </div>
            </div>

            <button onClick={() => { setShowResult(false); setBasket([]); setCustomerName(''); setCustomerPhone(''); }} className="w-full bg-orange-500 text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition">Yeni Sifariş</button>
          </div>
        )}

        {/* Receipt Modal for History */}
        {selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200 print:bg-white print:p-0">
            <div className={`${cardBg} w-full max-w-sm rounded-[40px] border ${border} shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300 print:shadow-none print:border-none print:max-w-full`}>
              {/* Thermal Receipt Content */}
              <div id="thermal-receipt" className="p-8 space-y-6 bg-white text-black font-sans print:p-0 print:w-full print:text-black">
                <div className="text-center space-y-2 border-b-2 border-dashed border-black pb-4">
                  <h2 className="text-2xl font-black uppercase tracking-tight">LAÇIN SATIŞ</h2>
                  <p className="text-xs font-bold">Təşəkkür edirik!</p>
                  <p className="text-[10px] opacity-70">Sifariş ID: #{selectedReceipt.id}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-black border-b-2 border-black pb-1">
                    <span>Məhsul</span>
                    <span>Məbləğ</span>
                  </div>
                  {selectedReceipt.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100 print:border-black/5">
                      <span className="font-medium">
                        {item.name} x {item.quantity}
                        <span className="text-[10px] text-gray-500 ml-1">({item.price.toFixed(2)} ₼)</span>
                        {item.gift_quantity ? <span className="text-green-600 ml-1">(+{item.gift_quantity}🎁)</span> : ''}
                      </span>
                      <span className="font-bold">{(item.price * item.quantity).toFixed(2)} ₼</span>
                    </div>
                  ))}
                  {selectedReceipt.gift_quantity > 0 && (
                    <p className="text-sm text-green-600 font-black border-t border-dashed border-black pt-2">🎁 Hədiyyə: {selectedReceipt.gift_quantity} ədəd</p>
                  )}
                </div>

                <div className="pt-4 border-t-4 border-double border-black flex justify-between items-center">
                  <span className="font-black text-sm uppercase">Yekun Məbləğ</span>
                  <span className="text-2xl font-black">{selectedReceipt.total_amount.toFixed(2)} ₼</span>
                </div>

                <div className="text-xs space-y-2 pt-4 border-t border-dashed border-black">
                  <p><span className="font-bold">Müştəri:</span> {selectedReceipt.customer_name}</p>
                  <p><span className="font-bold">Telefon:</span> {selectedReceipt.customer_phone}</p>
                  <p><span className="font-bold">Tarix:</span> {new Date(selectedReceipt.created_at).toLocaleString('az-AZ')}</p>
                </div>

                <div className="text-center pt-6 border-t-2 border-dashed border-black/10">
                  <p className="text-[10px] font-bold italic">Yolunuz açıq olsun! 🍞</p>
                </div>
              </div>

              <div className="p-4 bg-black/5 flex flex-col gap-2 no-print">
                <button onClick={handlePrint} className="bg-green-600 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 w-full">🖨️ Çap Et</button>
                {role === 'admin' && (
                  <button onClick={() => deleteSale(selectedReceipt.id)} className="bg-red-500 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 w-full">❌ Sifarişi Ləğv Et (Sil)</button>
                )}
                <button onClick={() => setSelectedReceipt(null)} className="bg-gray-900 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 w-full">Bağla</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Partial Payment Modal ── */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-end justify-center p-6">
            <div className={`${cardBg} w-full max-w-sm rounded-[32px] border ${border} shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom-10 duration-200`}>
              <h3 className="font-black text-lg">💳 Ödəniş Yaz</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ümumi Məbləğ:</span>
                  <span className="font-bold">{showPayModal.total.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Artıq Ödənildi:</span>
                  <span className="font-bold text-green-500">{showPayModal.paid.toFixed(2)} ₼</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Qalan Borc:</span>
                  <span className="font-bold text-red-500">{Math.max(0, showPayModal.total - showPayModal.paid).toFixed(2)} ₼</span>
                </div>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="Ödənilən məbləğ (₼)"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className={`w-full p-4 rounded-2xl ${inputBg} border-2 border-transparent focus:border-orange-500 outline-none text-lg font-bold`}
                autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPayAmount((showPayModal.total - showPayModal.paid).toFixed(2))}
                  className="py-2 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-bold border border-green-500/20 active:scale-95"
                >
                  Tam Borc
                </button>
                <button
                  onClick={() => updatePaidAmount(showPayModal.id, showPayModal.total)}
                  disabled={loading}
                  className="py-2 bg-green-500 text-white rounded-xl text-[10px] font-bold active:scale-95 disabled:opacity-40"
                >
                  ✅ Tam Ödə
                </button>
                <button
                  onClick={() => {
                    const val = parseFloat(payAmount);
                    if (isNaN(val) || val <= 0) return;
                    updatePaidAmount(showPayModal.id, showPayModal.paid + val);
                  }}
                  disabled={loading || !payAmount}
                  className="py-2 bg-blue-500 text-white rounded-xl text-[10px] font-bold active:scale-95 disabled:opacity-40"
                >
                  💳 Yaz
                </button>
              </div>
              <button onClick={() => setShowPayModal(null)} className="w-full py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold text-sm active:scale-95">Bağla</button>
            </div>
          </div>
        )}

        {/* ── Order Edit Modal ── */}
        {editingSale && (
          <div className="fixed inset-0 z-[300] flex flex-col bg-black/60">
            {/* Tap backdrop to close */}
            <div className="flex-1 min-h-[60px]" onClick={() => { setEditingSale(null); setEditSaleItems([]); }} />

            {/* Sheet — max 90% screen height, scrollable inside */}
            <div className={`${cardBg} w-full rounded-t-[32px] border-t ${border} shadow-2xl flex flex-col max-h-[90vh]`}>
              {/* Fixed header */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-black/10 shrink-0">
                <button
                  onClick={() => { setEditingSale(null); setEditSaleItems([]); }}
                  className={`w-9 h-9 rounded-full ${inputBg} flex items-center justify-center text-gray-500 font-bold text-lg active:scale-95`}
                >
                  ←
                </button>
                <div className="flex-1">
                  <p className="font-black text-base">Sifariş #{editingSale.id}</p>
                  <p className="text-[10px] text-gray-400">{editingSale.customer_name}</p>
                </div>
                <span className="text-xl font-black text-orange-500">
                  {editSaleItems.reduce((acc, i) => acc + i.price * i.quantity, 0).toFixed(2)} ₼
                </span>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

                {/* — Müştəri məlumatları — */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Müştəri</p>
                  <input type="text" placeholder="Müştəri adı" value={editSaleCustomer}
                    onChange={e => setEditSaleCustomer(e.target.value)}
                    className={`w-full p-3 rounded-2xl ${inputBg} border-2 border-transparent focus:border-orange-500 outline-none text-sm`} />
                  <div className="flex gap-2">
                    <input type="tel" placeholder="Telefon" value={editSalePhone}
                      onChange={e => setEditSalePhone(e.target.value)}
                      className={`flex-1 p-3 rounded-2xl ${inputBg} border-2 border-transparent focus:border-orange-500 outline-none text-sm`} />
                    <input type="date" value={editSaleDate}
                      onChange={e => setEditSaleDate(e.target.value)}
                      className={`flex-1 p-3 rounded-2xl ${inputBg} border-2 border-transparent focus:border-orange-500 outline-none text-sm`} />
                  </div>
                </div>

                {/* — Seçilmiş məhsullar — */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Məhsullar ({editSaleItems.length})</p>
                  {editSaleItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4 border-2 border-dashed border-gray-200 rounded-2xl">Məhsul seçilməyib</p>
                  )}
                  {editSaleItems.map((item, idx) => (
                    <div key={item.product_id} className={`${inputBg} rounded-2xl p-3`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="text-[10px] text-orange-500 font-black">{item.price.toFixed(2)} ₼ × {item.quantity} = {(item.price * item.quantity).toFixed(2)} ₼</p>
                        </div>
                        <button onClick={() => setEditSaleItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-xs font-bold active:scale-95">✕</button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 flex-1">
                          <button onClick={() => setEditSaleItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, it.quantity - 1) } : it))}
                            className="w-8 h-8 rounded-xl bg-gray-200 font-bold text-sm active:scale-95">−</button>
                          <span className="flex-1 text-center font-black">{item.quantity}</span>
                          <button onClick={() => setEditSaleItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))}
                            className="w-8 h-8 rounded-xl bg-gray-200 font-bold text-sm active:scale-95">+</button>
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-green-600 font-bold whitespace-nowrap">🎁</span>
                          <input type="number" min="0" placeholder="0" value={item.gift_quantity || ''}
                            onChange={e => setEditSaleItems(prev => prev.map((it, i) => i === idx ? { ...it, gift_quantity: parseInt(e.target.value) || 0 } : it))}
                            className="flex-1 p-1.5 rounded-xl border border-green-200 text-center text-sm font-bold outline-none bg-green-50 min-w-0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* — Məhsul əlavə et — */}
                {products.filter(p => !editSaleItems.find(i => i.product_id === p.id)).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">+ Məhsul əlavə et</p>
                    <div className="grid grid-cols-2 gap-2">
                      {products.filter(p => !editSaleItems.find(i => i.product_id === p.id)).map(p => (
                        <button key={p.id}
                          onClick={() => setEditSaleItems(prev => [...prev, { product_id: p.id, name: p.name, price: p.price, quantity: 1, gift_quantity: 0 }])}
                          className={`${inputBg} p-3 rounded-2xl border-2 border-dashed ${border} text-left active:scale-95 transition-all hover:border-orange-300`}>
                          <span className="text-xs font-bold block leading-tight">{p.name}</span>
                          <span className="text-[10px] font-black text-orange-500">{p.price.toFixed(2)} ₼</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* — Sifarişi sil — */}
                <button
                  onClick={() => { if (confirm('Bu sifarişi silmək istəyirsiniz?')) { deleteSale(editingSale.id); setEditingSale(null); setEditSaleItems([]); } }}
                  className="w-full py-3 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl font-bold text-sm active:scale-95"
                >
                  🗑 Sifarişi Sil
                </button>

                <div className="h-2" /> {/* bottom spacing */}
              </div>

              {/* Fixed footer */}
              <div className={`px-5 py-4 border-t border-black/10 shrink-0 ${cardBg}`}>
                <button
                  onClick={() => saveEditedSale(editingSale.id, editSaleItems, editSaleCustomer, editSalePhone, editSaleDate)}
                  disabled={loading || editSaleItems.length === 0}
                  className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 disabled:opacity-40"
                >
                  {loading ? 'Saxlanır...' : '✅ Dəyişiklikləri Saxla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed top-6 left-6 right-6 bg-red-500 text-white p-4 rounded-2xl shadow-2xl animate-bounce flex justify-between items-center z-[100]">
            <span className="font-bold text-sm">⚠️ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        <style jsx global>{`
          @media print {
            /* Hide everything by default */
            body * {
              visibility: hidden !important;
            }
            
            /* Background should be white */
            body, html {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            /* Show ONLY the receipt and its content */
            #thermal-receipt, #thermal-receipt * {
              visibility: visible !important;
              color: black !important;
            }

            #thermal-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 40px !important;
              margin: 0 !important;
              background: white !important;
              display: block !important;
              border: none !important;
              z-index: 9999999 !important;
            }

            /* Extra force to hide UI elements */
            .no-print, header, footer, button {
              display: none !important;
              opacity: 0 !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}