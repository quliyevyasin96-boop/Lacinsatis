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
  latitude?: number;
  longitude?: number;
  items?: BasketItem[];
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
  const [role, setRole] = useState<'admin' | 'courier' | 'expert' | null>(null);
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
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'stats' | 'expenses' | 'map'>('sales');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<SaleResult | null>(null);

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
          setRole('admin');
          setIsActualAdmin(true);
          setIsAuthorized(true);
          setAuthLoading(false);
        }
      } else {
        setRole('admin');
        setIsActualAdmin(true);
        setIsAuthorized(true);
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
      if (role === 'admin' || role === 'courier' || role === 'expert') fetchAllSales();
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
      const res = await fetch('/api/sales');
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
      setExpenses(data);
    } catch {
      setError('Xərclər yüklənə bilmədi');
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

  const downloadReceipt = () => {
    if (!selectedReceipt) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 400;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Fond
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Mətn ayarları
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'center';

    // Loqo və Başlıq
    ctx.fillText('LAÇIN SATIŞ', width / 2, 50);
    ctx.font = '14px Courier New';
    ctx.fillText('---------------------------', width / 2, 70);
    ctx.fillText(`Sifariş ID: #${selectedReceipt.id}`, width / 2, 90);
    ctx.fillText('---------------------------', width / 2, 110);

    // Məhsullar
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px Courier New';
    let y = 140;
    selectedReceipt.items?.forEach(item => {
      ctx.fillText(`${item.name} x ${item.quantity}`, 40, y);
      ctx.textAlign = 'right';
      ctx.fillText(`${(item.price * item.quantity).toFixed(2)} ₼`, width - 40, y);
      ctx.textAlign = 'left';
      y += 30;
    });

    if (selectedReceipt.gift_quantity > 0) {
      ctx.fillStyle = 'green';
      ctx.fillText(`🎁 Hədiyyə: ${selectedReceipt.gift_quantity} ədəd`, 40, y);
      ctx.fillStyle = 'black';
      y += 40;
    }

    // Yekun
    ctx.fillText('---------------------------', width / 2, y);
    y += 30;
    ctx.font = 'bold 22px Courier New';
    ctx.fillText('YE K U N:', 40, y);
    ctx.textAlign = 'right';
    ctx.fillText(`${selectedReceipt.total_amount.toFixed(2)} ₼`, width - 40, y);

    // Müştəri məlumatı
    ctx.textAlign = 'left';
    ctx.font = '12px Courier New';
    y += 50;
    ctx.fillText(`Müştəri: ${selectedReceipt.customer_name}`, 40, y);
    y += 20;
    ctx.fillText(`Telefon: ${selectedReceipt.customer_phone}`, 40, y);
    y += 20;
    ctx.fillText(`Tarix: ${new Date(selectedReceipt.created_at).toLocaleString()}`, 40, y);

    // Download
    const link = document.createElement('a');
    link.download = `cek_${selectedReceipt.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
    if (!customerPhone) {
      setError('Müştəri telefonu mütləqdir!');
      return;
    }
    if (!location) {
      setError('Məkan (Lokasiya) mütləqdir! Zəhmət olmasa lokasiyanı əlavə edin.');
      return;
    }
    if (basket.length === 0) {
      setError('Səbət boşdur! Ən azı bir məhsul seçilməlidir.');
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
          date, customer_name: customerName, customer_phone: customerPhone,
          latitude: location?.lat || null, longitude: location?.lon || null,
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
              <option value="expert">Ekspert</option>
            </select>
          )}
        </header>

        {/* --- ADMIN VIEW --- */}
        {role === 'admin' && (
          <div className="space-y-6">
            <div className="flex overflow-x-auto space-x-2 bg-black/5 p-1 rounded-2xl no-scrollbar">
              <button onClick={() => setActiveTab('sales')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'sales' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Sifarişlər</button>
              <button onClick={() => setActiveTab('products')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'products' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Məhsullar</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'stats' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Statistika</button>
              <button onClick={() => setActiveTab('expenses')} className={`flex-none px-4 py-2 rounded-xl font-bold text-xs ${activeTab === 'expenses' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400'}`}>Xərclər</button>
            </div>

            {activeTab === 'sales' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Bütün Sifarişlər</h3>
                {allSales.map(s => (
                  <div key={s.id} className={`${cardBg} rounded-3xl border ${border} shadow-sm overflow-hidden`}>
                    <div onClick={() => setExpandedSaleId(expandedSaleId === s.id ? null : s.id)} className="p-5 flex justify-between items-center cursor-pointer">
                      <div>
                        <p className="font-bold">#{s.id} - {s.customer_name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{s.total_amount.toFixed(2)} ₼</p>
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${s.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {s.status === 'delivered' ? 'Çatdırıldı' : 'Gözləyir'}
                        </span>
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
                        <div className="pt-2 border-t border-black/5 flex justify-between text-[11px]">
                          <span className="text-gray-400">Ekspert:</span>
                          <span className="font-bold">{s.expert_name || s.expert_id || 'Naməlum'}</span>
                        </div>
                        {s.courier_name && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400">Kuryer:</span>
                            <span className="font-bold text-green-600">{s.courier_name}</span>
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedReceipt(s); }}
                          className="w-full mt-2 py-2 bg-orange-500/10 text-orange-500 rounded-xl text-[10px] font-bold border border-orange-500/20"
                        >
                          🧾 Çeki Göstər
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`${cardBg} p-5 rounded-3xl border border-green-500/20 shadow-lg`}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ümumi Gəlir</p>
                    <p className="text-xl font-black text-green-500">{totalIncome.toFixed(2)} ₼</p>
                  </div>
                  <div className={`${cardBg} p-5 rounded-3xl border border-red-500/20 shadow-lg`}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ümumi Xərc</p>
                    <p className="text-xl font-black text-red-500">{totalExpense.toFixed(2)} ₼</p>
                  </div>
                </div>
                <div className={`${cardBg} p-6 rounded-3xl border-2 border-orange-500 shadow-xl text-center`}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Xalis Mənfəət</p>
                  <p className="text-4xl font-black text-orange-500">{netProfit.toFixed(2)} ₼</p>
                </div>
                <div className={`${cardBg} p-6 rounded-3xl border ${border} space-y-4`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Məhsul Statistikası</h3>
                  {products.map(p => {
                    const count = allSales.reduce((acc, s) => acc + (s.items?.filter(i => i.product_id === p.id).reduce((sum, i) => sum + i.quantity, 0) || 0), 0);
                    return (
                      <div key={p.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{p.name}</span>
                          <span>{count} ədəd</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{ width: `${Math.min(100, (count / (allSales.length || 1)) * 20)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
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
                    <div key={e.id} className={`${cardBg} p-4 rounded-3xl border ${border} flex justify-between items-center`}>
                      <div>
                        <p className="font-bold">{e.description}</p>
                        <p className="text-[10px] text-gray-400">{e.date}</p>
                      </div>
                      <p className="text-sm font-black text-red-500">-{e.amount.toFixed(2)} ₼</p>
                    </div>
                  ))}
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
                      <p className="text-orange-500 font-bold">{s.total_amount.toFixed(2)} ₼</p>
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

        {/* --- EXPERT VIEW --- */}
        {role === 'expert' && !showResult && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className={`${cardBg} p-6 rounded-3xl border-2 border-orange-500/10 shadow-lg`}>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bugünkü Sifariş</h3>
                <p className="text-3xl font-black text-orange-500">{todayOrders}</p>
              </div>
              <div className={`${cardBg} p-6 rounded-3xl border-2 border-green-500/10 shadow-lg`}>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bugünkü Satış</h3>
                <p className="text-2xl font-black text-green-500">{todaySalesTotal.toFixed(2)} ₼</p>
              </div>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 ml-1">Məhsullar</h3>
              <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                  <button key={p.id} onClick={() => addToBasket(p)} className={`${cardBg} p-3 rounded-2xl border ${border} flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm min-h-[80px]`}>
                    <span className="text-xs font-bold leading-tight mb-1">{p.name}</span>
                    <span className="text-[10px] font-black text-orange-500">{p.price.toFixed(2)} ₼</span>
                  </button>
                ))}
              </div>
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
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Müştəri adı" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
              <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Telefon" className={`w-full p-4 rounded-2xl ${inputBg} outline-none border-2 border-transparent focus:border-orange-500`} />
              <button onClick={getLocation} className={`w-full p-4 rounded-2xl ${inputBg} text-sm font-bold text-gray-400 border-2 border-dashed ${border}`}>
                {locationLoading ? '🔄 Məkan axtarılır...' : location ? `📍 ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : '📍 Lokasiya Əlavə Et'}
              </button>
            </section>

            <div className={`fixed bottom-0 left-0 right-0 p-6 ${bg} border-t ${border} backdrop-blur-lg bg-opacity-90 z-50`}>
              <div className="max-w-md mx-auto flex justify-between items-center">
                <p className="text-2xl font-black text-orange-500">{getTotal().toFixed(2)} ₼</p>
                <button onClick={submitSale} disabled={loading || basket.length === 0} className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-bold shadow-xl active:scale-95 disabled:opacity-30">
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
                    <span>{item.name} x {item.quantity}</span>
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
              <div id="thermal-receipt" className="p-8 space-y-6 bg-white text-black font-mono print:p-0 print:w-full">
                <div className="text-center space-y-2 border-b-2 border-dashed border-black/10 pb-4">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Laçın Satış</h2>
                  <p className="text-[10px]">Təşəkkür edirik!</p>
                  <p className="text-[8px] opacity-50">Sifariş ID: #{selectedReceipt.id}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold border-b border-black/5 pb-1">
                    <span>Məhsul</span>
                    <span>Məbləğ</span>
                  </div>
                  {selectedReceipt.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-bold">{(item.price * item.quantity).toFixed(2)} ₼</span>
                    </div>
                  ))}
                  {selectedReceipt.gift_quantity > 0 && (
                    <p className="text-[10px] text-green-600 font-bold border-t border-dashed border-black/10 pt-1">🎁 Hədiyyə: {selectedReceipt.gift_quantity} ədəd</p>
                  )}
                </div>

                <div className="pt-4 border-t-2 border-dashed border-black/20 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase">Yekun</span>
                  <span className="text-xl font-black">{selectedReceipt.total_amount.toFixed(2)} ₼</span>
                </div>

                <div className="text-[9px] space-y-1 pt-4 border-t border-black/5">
                  <p>👤 Müştəri: {selectedReceipt.customer_name}</p>
                  <p>📱 Telefon: {selectedReceipt.customer_phone}</p>
                  <p>📅 Tarix: {new Date(selectedReceipt.created_at).toLocaleString()}</p>
                </div>

                <div className="text-center pt-4 border-t border-dashed border-black/10">
                  <p className="text-[8px] italic">Yolunuz açıq olsun!</p>
                </div>
              </div>

              <div className="p-4 bg-black/5 grid grid-cols-2 gap-2 no-print">
                <button onClick={() => window.print()} className="bg-green-600 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95">🖨️ Çap Et</button>
                <button onClick={downloadReceipt} className="bg-blue-600 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95">📥 Yüklə</button>
                {role === 'admin' && (
                  <button onClick={() => deleteSale(selectedReceipt.id)} className="bg-red-500 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 col-span-2">❌ Sifarişi Ləğv Et (Sil)</button>
                )}
                <button onClick={() => setSelectedReceipt(null)} className="bg-gray-900 text-white py-3 rounded-2xl font-bold text-xs shadow-lg active:scale-95 col-span-2">Bağla</button>
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
            body * { visibility: hidden; }
            #thermal-receipt, #thermal-receipt * { visibility: visible; }
            #thermal-receipt { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; background: white !important; color: black !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </main>
  );
}