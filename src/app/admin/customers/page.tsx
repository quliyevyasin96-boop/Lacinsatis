'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => (
  <div className="h-[500px] rounded-2xl bg-gray-100 flex items-center justify-center">
    <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
) });

const LocationPicker = dynamic(() => import('./LocationPicker'), { ssr: false });

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  lat?: number | null;
  lon?: number | null;
  expert_id?: number | null;
  expert_name?: string | null;
}

interface Sale {
  id: number;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  paid_amount?: number;
  payment_status?: string;
  latitude?: number;
  longitude?: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState<'all' | 'debtors' | 'paid'>('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [locationPickerCustomer, setLocationPickerCustomer] = useState<{ id: number | string; name: string } | null>(null);

  // Migration state
  const [showMigration, setShowMigration] = useState(false);
  const [migrateId, setMigrateId] = useState('');
  const [migrateName, setMigrateName] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<{ total: number; updated: number; added: number; expert_id: number } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/sales').then(r => r.json()),
    ]).then(([c, s]) => {
      setCustomers(Array.isArray(c) ? c : []);
      setSales(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  function getStatsForCustomer(name: string) {
    const cs = sales.filter(s => s.customer_name === name);
    const total = cs.reduce((a, s) => a + s.total_amount, 0);
    const paid = cs.reduce((a, s) => a + (s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0)), 0);
    return { total, paid, debt: total - paid, count: cs.length };
  }

  // Get last known location for each customer name from sales
  function getLocationForCustomer(name: string): { lat: number; lng: number } | null {
    const cs = sales.filter(s => s.customer_name === name && s.latitude && s.longitude);
    if (cs.length === 0) return null;
    return { lat: cs[cs.length - 1].latitude!, lng: cs[cs.length - 1].longitude! };
  }

  const salesNames = [...new Set(sales.map(s => s.customer_name))];
  const allNames = [...new Set([...customers.map(c => c.name), ...salesNames])];

  const enriched = allNames.map(name => {
    const cust = customers.find(c => c.name === name);
    const stats = getStatsForCustomer(name);
    const loc = cust?.lat && cust?.lon
      ? { lat: cust.lat, lng: cust.lon }
      : getLocationForCustomer(name);
    const phone = cust?.phone || sales.find(s => s.customer_name === name)?.customer_phone || '';
    return { id: cust?.id ?? null, name, phone, stats, loc };
  });

  const filtered = enriched.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
    if (filterDebt === 'debtors' && c.stats.debt <= 0) return false;
    if (filterDebt === 'paid' && c.stats.debt > 0) return false;
    return true;
  }).sort((a, b) => b.stats.debt - a.stats.debt);

  const pins = useMemo(() => enriched
    .filter(c => c.loc)
    .map(c => ({
      name: c.name,
      phone: c.phone,
      lat: c.loc!.lat,
      lng: c.loc!.lng,
      debt: c.stats.debt,
      total: c.stats.total,
      paid: c.stats.paid,
      count: c.stats.count,
    })), [enriched]);

  const mapPins = filterDebt === 'all' ? pins
    : filterDebt === 'debtors' ? pins.filter(p => p.debt > 0)
    : pins.filter(p => p.debt <= 0);

  const totalDebt = enriched.reduce((a, c) => a + c.stats.debt, 0);
  const debtorCount = enriched.filter(c => c.stats.debt > 0).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cəmi Müştəri</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{enriched.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Borclu</div>
          <div className="text-2xl font-black text-red-500 mt-1">{debtorCount}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ümumi Borc</div>
          <div className="text-2xl font-black text-red-500 mt-1">{totalDebt.toFixed(2)} ₼</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Xəritədə</div>
          <div className="text-2xl font-black text-orange-500 mt-1">{pins.length}</div>
        </div>
      </div>

      {/* Miqrasiya paneli */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-blue-700">🔄 Ekspeditor Miqrasiyası</h3>
            <p className="text-xs text-blue-400 mt-0.5">Köhnə marketlərə expert_id bağlamaq üçün</p>
          </div>
          <button
            onClick={() => setShowMigration(!showMigration)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold active:scale-95"
          >
            {showMigration ? 'Bağla' : 'İşlət'}
          </button>
        </div>
        {showMigration && (
          <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-3">
            <p className="text-xs text-gray-500">Bütün köhnə marketlərə (expert_id olmayanlara) seçilmiş ekspeditor ID-si yazılacaq.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ekspeditor ID</label>
                <input
                  type="number"
                  value={migrateId}
                  onChange={e => setMigrateId(e.target.value)}
                  placeholder="5090683511"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Ekspeditor Adı (opsional)</label>
                <input
                  type="text"
                  value={migrateName}
                  onChange={e => setMigrateName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                if (!migrateId) return;
                setMigrating(true);
                setMigrateResult(null);
                try {
                  const res = await fetch('/api/migrate-customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ expert_id: parseInt(migrateId), expert_name: migrateName || null }),
                  });
                  const data = await res.json();
                  setMigrateResult(data);
                  if (data.success) {
                    // Yenidən yüklə
                    const [c, s] = await Promise.all([
                      fetch('/api/customers').then(r => r.json()),
                      fetch('/api/sales').then(r => r.json()),
                    ]);
                    setCustomers(Array.isArray(c) ? c : []);
                    setSales(Array.isArray(s) ? s : []);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setMigrating(false);
                }
              }}
              disabled={migrating || !migrateId}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 disabled:opacity-50"
            >
              {migrating ? 'İşləyir...' : '✅ Miqrasiya Et'}
            </button>
            {migrateResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-green-700">✅ Miqrasiya tamamlandı!</p>
                <p>📋 Ümumi: {migrateResult.total} müştəri</p>
                <p>🔄 Yenilənən: {migrateResult.updated} müştəri</p>
                <p>👤 Ekspeditor ID: {migrateResult.expert_id}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters + view toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Axtarış</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, telefon..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="flex gap-2">
          {(['all', 'debtors', 'paid'] as const).map(v => (
            <button key={v} onClick={() => setFilterDebt(v)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition
                ${filterDebt === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {v === 'all' ? 'Hamısı' : v === 'debtors' ? 'Borclular' : 'Ödəniblər'}
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          <button onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition
              ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            ☰ Siyahı
          </button>
          <button onClick={() => setView('map')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition
              ${view === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            🗺 Xəritə
          </button>
        </div>
      </div>

      {/* Map view */}
      {view === 'map' && (() => {
        const noLoc = filtered.filter(c => !c.loc);
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-3">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs font-semibold text-gray-500">{mapPins.length} müştəri xəritədə</span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Borclu</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Ödənilib</span>
                </div>
              </div>
              <MapView pins={mapPins} />
            </div>

            {/* Customers without location */}
            {noLoc.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Konumu olmayan müştərilər</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{noLoc.length}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {noLoc.map(c => (
                      <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">{c.name}</div>
                          {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-gray-400">{c.stats.count} sifariş</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800">{c.stats.total.toFixed(2)} ₼</td>
                        <td className="px-5 py-3 text-right">
                          {c.stats.debt > 0
                            ? <span className="text-xs font-semibold text-red-500">{c.stats.debt.toFixed(2)} ₼ borc</span>
                            : <span className="text-xs text-green-500 font-semibold">Ödənilib</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {c.id != null && (
                            <button
                              onClick={() => setLocationPickerCustomer({ id: c.id!, name: c.name })}
                              className="text-xs font-semibold text-orange-500 hover:text-orange-700 whitespace-nowrap transition"
                            >
                              📍 Konum əlavə et
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Location picker modal */}
      {locationPickerCustomer && (
        <LocationPicker
          customerName={locationPickerCustomer.name}
          customerId={locationPickerCustomer.id}
          onSaved={async () => {
            setLocationPickerCustomer(null);
            setLoading(true);
            const [c, s] = await Promise.all([
              fetch('/api/customers').then(r => r.json()),
              fetch('/api/sales').then(r => r.json()),
            ]);
            setCustomers(Array.isArray(c) ? c : []);
            setSales(Array.isArray(s) ? s : []);
            setLoading(false);
          }}
          onClose={() => setLocationPickerCustomer(null)}
        />
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Müştəri</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Konum</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Sifarişlər</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Cəmi</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Ödənilib</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Borc</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.name} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {c.loc ? (
                          <a
                            href={`https://www.google.com/maps?q=${c.loc.lat},${c.loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-700 transition"
                          >
                            📍 Xəritədə aç
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">{c.stats.count}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{c.stats.total.toFixed(2)} ₼</td>
                      <td className="px-5 py-3 text-right text-green-600 font-medium">{c.stats.paid.toFixed(2)} ₼</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${c.stats.debt > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                          {c.stats.debt > 0 ? `${c.stats.debt.toFixed(2)} ₼` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Müştəri tapılmadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
