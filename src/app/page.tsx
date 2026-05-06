'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: number;
}

interface SaleResult {
  id: number;
  customer_name: string;
  product_name: string;
  quantity: number;
  gift_quantity: number;
  total_amount: number;
}

export default function Home() {
  const [sdkReady, setSdkReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [giftQuantity, setGiftQuantity] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<SaleResult | null>(null);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Telegram SDK initialization
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    
    const init = () => {
      if (tg) {
        tg.ready();
        tg.expand();
        setDarkMode(tg.colorScheme === 'dark');
      }
      setSdkReady(true);
    };

    if (tg) {
      init();
    } else {
      // Wait for SDK to load
      const check = setInterval(() => {
        const tgCheck = (window as any).Telegram?.WebApp;
        if (tgCheck) {
          clearInterval(check);
          init();
        }
      }, 100);
      
      // Fallback after 3 seconds
      setTimeout(() => {
        clearInterval(check);
        if (!sdkReady) init();
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (sdkReady) {
      setDate(new Date().toISOString().split('T')[0]);
      fetchProducts();
    }
  }, [sdkReady]);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch {
      setError('Məhsullar yüklənə bilmədi');
    }
  }

  function getLocation() {
    setLocationLoading(true);
    
    const tg = (window as any).Telegram?.WebApp;
    
    if (tg?.locationManager) {
      tg.locationManager.getLocation((loc: any) => {
        setLocation({ lat: loc.latitude, lon: loc.longitude });
        setLocationLoading(false);
        if (tg.hapticFeedback) tg.hapticFeedback.impact('light');
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  }

  function getTotal() {
    const product = products.find(p => p.id === selectedProduct);
    if (!product || !quantity) return null;
    return product.price * quantity;
  }

  async function submitSale() {
    if (!customerName || !selectedProduct || !quantity) {
      setError('Bütün sahələri doldurun!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          customer_name: customerName,
          customer_phone: customerPhone,
          latitude: location?.lat || null,
          longitude: location?.lon || null,
          product_id: selectedProduct,
          quantity,
          gift_quantity: giftQuantity
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error('Xəta');
      
      setResult(data);
      setShowResult(true);

      const tg = (window as any).Telegram?.WebApp;
      if (tg?.hapticFeedback) tg.hapticFeedback.notification('success');
      
    } catch {
      setError('Xəta baş verdi. Yenidən cəhd edin.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setShowResult(false);
    setResult(null);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedProduct(0);
    setQuantity(1);
    setGiftQuantity(0);
    setLocation(null);
  }

  // Loading state
  if (!sdkReady) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">
            🍞
          </div>
          <p className="text-gray-500">Yüklənir...</p>
        </div>
      </div>
    );
  }

  const bg = darkMode ? 'bg-[#0f0f1a]' : 'bg-white';
  const cardBg = darkMode ? 'bg-[#1a1a2e]' : 'bg-[#f5f5f5]';
  const text = darkMode ? 'text-white' : 'text-[#1f1f1f]';
  const border = darkMode ? 'border-[#2d2d44]' : 'border-[#e5e5e5]';
  const inputBg = darkMode ? 'bg-[#252540]' : 'bg-white';
  const muted = darkMode ? 'text-white/60' : 'text-[#1f1f1f]/60';

  const total = getTotal();
  const selectedProductData = products.find(p => p.id === selectedProduct);

  // Result screen
  if (showResult && result) {
    return (
      <main className={`min-h-screen ${bg} p-4 pb-24`}>
        <div className="text-center pt-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl text-white">✓</span>
          </div>
          <h2 className={`text-2xl font-bold ${text}`}>Uğurlu Əməliyyat!</h2>
          <p className={`${muted} mt-1`}>Satış qeydə alındı</p>
        </div>

        <div className={`${cardBg} rounded-2xl p-4 mt-6 border ${border}`}>
          <div className={`flex justify-between py-3 border-b ${border}`}>
            <span className={muted}>Müştəri</span>
            <span className={`font-semibold ${text}`}>{result.customer_name}</span>
          </div>
          <div className={`flex justify-between py-3 border-b ${border}`}>
            <span className={muted}>Məhsul</span>
            <span className={`font-semibold ${text}`}>{result.product_name}</span>
          </div>
          <div className={`flex justify-between py-3 border-b ${border}`}>
            <span className={muted}>Miqdar</span>
            <span className={`font-semibold ${text}`}>{result.quantity} ədəd</span>
          </div>
          <div className={`flex justify-between py-3 border-b ${border}`}>
            <span className={muted}>Hədiyyə</span>
            <span className={`font-semibold ${text}`}>{result.gift_quantity} ədəd</span>
          </div>
          <div className="flex justify-between py-3 pt-4">
            <span className={muted}>Cəm Məbləğ</span>
            <span className="font-bold text-xl text-orange-500">{result.total_amount} ₼</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className={`text-sm ${muted} mb-3`}>QR Kod - ID: #{result.id}</p>
          <div className={`${cardBg} rounded-2xl p-5 inline-block border ${border}`}>
            <div className="w-32 h-32 bg-gray-200 flex items-center justify-center rounded-lg">
              <span className={`text-sm ${muted}`}>QR Kod</span>
            </div>
          </div>
          <p className={`text-xs ${muted} mt-3`}>Skan edərək məlumatları görün</p>
        </div>

        <button
          onClick={resetForm}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-4 rounded-2xl mt-6 cursor-pointer active:scale-95 transition"
        >
          Yeni Satış
        </button>
      </main>
    );
  }

  // Main form
  return (
    <main className={`min-h-screen ${bg} p-4 pb-24`}>
      <div className="text-center pt-6">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
          🍞
        </div>
        <h1 className={`text-2xl font-bold ${text}`}>LəçinSatış</h1>
        <p className={`${muted} text-sm mt-1`}>Çörək Satış və Logistika</p>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded-xl text-sm mt-4">
          {error}
        </div>
      )}

      <div className={`${cardBg} rounded-2xl p-5 mt-4 border ${border}`}>
        {/* Date */}
        <label className={`text-xs font-semibold uppercase tracking-wide ${muted} block mb-3`}>📅 Tarix</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} text-base cursor-pointer`}
        />

        <div className={`h-px ${darkMode ? 'bg-[#2d2d44]' : 'bg-[#e5e5e5]'} my-5`} />
        
        {/* Customer Info */}
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted} mb-3`}>👤 Müştəri Məlumatları</p>

        <div className="mb-4">
          <label className={`text-sm font-medium ${muted} block mb-2`}>Müştərinin Adı *</label>
          <input
            type="text"
            placeholder="Məsələn: Kral Dönər"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} cursor-text`}
          />
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium ${muted} block mb-2`}>📱 Mobil Nömrə</label>
          <input
            type="tel"
            placeholder="050 123 45 67"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
            className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} cursor-text`}
          />
        </div>

        <div className="mb-4">
          <label className={`text-sm font-medium ${muted} block mb-2`}>📍 Kuryer Lokasiyası</label>
          <button
            onClick={getLocation}
            disabled={locationLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
          >
            {locationLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Gözləyin...
              </>
            ) : location ? (
              <>✓ Lokasiya Götürüldü</>
            ) : (
              <>📍 Lokasiyanı Göndər</>
            )}
          </button>
          {location && (
            <p className={`text-xs ${muted} mt-2 text-center`}>
              ✓ {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
            </p>
          )}
        </div>

        <div className={`h-px ${darkMode ? 'bg-[#2d2d44]' : 'bg-[#e5e5e5]'} my-5`} />
        
        {/* Product Info */}
        <p className={`text-xs font-semibold uppercase tracking-wide ${muted} mb-3`}>🍞 Məhsul Detalları</p>

        <div className="mb-4">
          <label className={`text-sm font-medium ${muted} block mb-2`}>Məhsul Seçin *</label>
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(Number(e.target.value))}
            className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} cursor-pointer`}
          >
            <option value={0}>-- Məhsul seçin --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} - {p.price} ₼</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={`text-sm font-medium ${muted} block mb-2`}>Miqdar *</label>
            <input
              type="number"
              value={quantity}
              min={1}
              onChange={e => setQuantity(Number(e.target.value))}
              className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} text-center text-xl font-bold cursor-text`}
            />
          </div>
          <div>
            <label className={`text-sm font-medium ${muted} block mb-2`}>Hədiyyə Miqdarı</label>
            <input
              type="number"
              value={giftQuantity}
              min={0}
              onChange={e => setGiftQuantity(Number(e.target.value))}
              className={`w-full p-4 rounded-xl border ${border} ${inputBg} ${text} text-center text-xl font-bold cursor-text`}
            />
          </div>
        </div>

        {total !== null && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 flex justify-between items-center text-white mt-4">
            <div>
              <p className="text-sm opacity-90">Cəm Məbləğ</p>
              <p className="text-xs opacity-80 mt-1">
                {quantity} × {selectedProductData?.price} ₼
              </p>
            </div>
            <p className="text-2xl font-bold">{total} ₼</p>
          </div>
        )}

        <button
          onClick={submitSale}
          disabled={loading}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold py-4 rounded-2xl mt-5 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Göndərilir...
            </>
          ) : '🚀 Göndər'}
        </button>
      </div>
    </main>
  );
}