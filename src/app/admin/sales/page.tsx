'use client';

import { useEffect, useState } from 'react';

interface BasketItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  gift_quantity?: number;
}

interface Sale {
  id: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  paid_amount?: number;
  payment_status?: string;
  status: string;
  date?: string;
  created_at: string;
  items?: BasketItem[];
  latitude?: number;
  longitude?: number;
  gift_quantity?: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/me').then(r => r.json()).then(d => setUserRole(d.role || null));
  }, []);
  const [search, setSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Edit modal state
  const [editSale, setEditSale] = useState<Sale | null>(null);
  const [editItems, setEditItems] = useState<BasketItem[]>([]);
  const [editCustomer, setEditCustomer] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editPaid, setEditPaid] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const handlePrint = () => {
    if (!selectedReceipt) return;
    const allElements = document.querySelectorAll('body *');
    const hiddenElements: { el: Element; display: string; visibility: string }[] = [];
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style.display !== 'none' && htmlEl.style.visibility !== 'hidden' && !htmlEl.closest('#thermal-receipt')) {
        hiddenElements.push({ el, display: htmlEl.style.display, visibility: htmlEl.style.visibility });
        htmlEl.style.display = 'none';
        htmlEl.style.visibility = 'hidden';
      }
    });
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
    window.print();
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
    }, 300);
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [s, p] = await Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ]);
    setSales(Array.isArray(s) ? s.sort((a: Sale, b: Sale) =>
      new Date(b.created_at || b.date || '').getTime() - new Date(a.created_at || a.date || '').getTime()
    ) : []);
    setProducts(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  function openEdit(s: Sale) {
    setEditSale(s);
    setEditItems(s.items ? s.items.map(i => ({ ...i })) : []);
    setEditCustomer(s.customer_name);
    setEditPhone(s.customer_phone || '');
    setEditDate((s.date || s.created_at || '').slice(0, 10));
    setEditPaid(s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0));
    setProductSearch('');
    setDeleteConfirm(false);
  }

  function closeEdit() {
    setEditSale(null);
    setDeleteConfirm(false);
  }

  function updateQty(idx: number, qty: number) {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, qty) } : it));
  }

  function updateGift(idx: number, gq: number) {
    setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, gift_quantity: Math.max(0, gq) } : it));
  }

  function removeItem(idx: number) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
  }

  function addProduct(p: Product) {
    setEditItems(prev => {
      const existing = prev.findIndex(i => i.product_id === p.id);
      if (existing >= 0) {
        return prev.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, { product_id: p.id, name: p.name, price: p.price, quantity: 1, gift_quantity: 0 }];
    });
    setProductSearch('');
  }

  const editTotal = editItems.reduce((a, i) => a + i.price * i.quantity, 0);

  async function saveSale() {
    if (!editSale) return;
    setSaving(true);
    await fetch(`/api/sales/${editSale.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: editItems,
        total_amount: editTotal,
        customer_name: editCustomer,
        customer_phone: editPhone,
        date: editDate,
        paid_amount: editPaid,
      }),
    });
    await loadData();
    setSaving(false);
    closeEdit();
  }

  async function deleteSale() {
    if (!editSale) return;
    setSaving(true);
    await fetch(`/api/sales/${editSale.id}`, { method: 'DELETE' });
    await loadData();
    setSaving(false);
    closeEdit();
  }

  const filtered = sales.filter(s => {
    const date = (s.date || s.created_at || '').slice(0, 10);
    if (filterFrom && date < filterFrom) return false;
    if (filterTo && date > filterTo) return false;
    if (search && !s.customer_name.toLowerCase().includes(search.toLowerCase()) &&
      !s.customer_phone?.includes(search)) return false;
    if (filterStatus === 'paid') {
      const debt = s.total_amount - (s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0));
      if (debt > 0) return false;
    }
    if (filterStatus === 'unpaid') {
      const debt = s.total_amount - (s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0));
      if (debt <= 0) return false;
    }
    return true;
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Axtarış</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ad, telefon..."
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Başlanğıc</label>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Son</label>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option value="all">Hamısı</option>
            <option value="paid">Ödənilib</option>
            <option value="unpaid">Borclu</option>
          </select>
        </div>
        {(search || filterFrom || filterTo || filterStatus !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterFrom(''); setFilterTo(''); setFilterStatus('all'); }}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition">
            Sıfırla
          </button>
        )}
        <div className="ml-auto text-xs text-gray-400 self-end pb-1">{filtered.length} nəticə</div>
      </div>

      {/* Table */}
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Müştəri</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Tarix</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Məbləğ</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Ödənilib</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const paid = s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0);
                  const debt = s.total_amount - paid;
                  return (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                      <td className="px-5 py-3 text-gray-400 text-xs">#{s.id}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{s.customer_name}</div>
                        {s.customer_phone && <div className="text-xs text-gray-400">{s.customer_phone}</div>}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{(s.date || s.created_at || '').slice(0, 10)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{s.total_amount.toFixed(2)} ₼</td>
                      <td className="px-5 py-3 text-right text-gray-600">{paid.toFixed(2)} ₼</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold
                          ${debt <= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {debt <= 0 ? 'Ödənilib' : `${debt.toFixed(2)} ₼ borc`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setSelectedReceipt(s)}
                          className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition mr-3">
                          🧾 Çek
                        </button>
                        {userRole !== 'salesman' && (
                          <button onClick={() => openEdit(s)}
                            className="text-xs font-semibold text-orange-500 hover:text-orange-700 transition">
                            Redaktə
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Heç bir nəticə tapılmadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200 print:bg-white print:p-0">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
            {/* Thermal Receipt Content */}
            <div id="thermal-receipt" className="p-8 space-y-5 bg-white text-black font-sans print:p-0 print:w-full print:text-black">
              <div className="text-center space-y-1 border-b-2 border-dashed border-black pb-4">
                <h2 className="text-xl font-black uppercase tracking-tight">LAÇIN SATIŞ</h2>
                <p className="text-xs font-bold">Təşəkkür edirik!</p>
                <p className="text-[10px] opacity-70">Sifariş ID: #{selectedReceipt.id}</p>
              </div>

              <div className="space-y-2">
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
                {!selectedReceipt.items || selectedReceipt.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Məhsul məlumatı yoxdur</p>
                ) : null}
                {(selectedReceipt.gift_quantity ?? 0) > 0 && (
                  <p className="text-sm text-green-600 font-black pt-1">🎁 Hədiyyə: {selectedReceipt.gift_quantity} ədəd</p>
                )}
              </div>

              <div className="pt-3 border-t-4 border-double border-black flex justify-between items-center">
                <span className="font-black text-sm uppercase">Yekun Məbləğ</span>
                <span className="text-2xl font-black">{selectedReceipt.total_amount.toFixed(2)} ₼</span>
              </div>

              <div className="text-xs space-y-1.5 pt-3 border-t border-dashed border-black">
                <p><span className="font-bold">Müştəri:</span> {selectedReceipt.customer_name}</p>
                {selectedReceipt.customer_phone && <p><span className="font-bold">Telefon:</span> {selectedReceipt.customer_phone}</p>}
                <p><span className="font-bold">Tarix:</span> {new Date(selectedReceipt.created_at).toLocaleString('az-AZ')}</p>
              </div>

              <div className="text-center pt-5 border-t-2 border-dashed border-black/10">
                <p className="text-[10px] font-bold italic">Yolunuz açıq olsun! 🍞</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex flex-col gap-2 print:hidden">
              <button onClick={handlePrint} className="bg-green-600 text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 w-full">🖨️ Çap Et</button>
              <button onClick={() => setSelectedReceipt(null)} className="bg-gray-800 text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 w-full">Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeEdit} />
          <div className="relative z-10 w-full max-w-lg h-full bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200">
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                ← Geri
              </button>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Sifariş #{editSale.id}</div>
                <div className="text-xs text-gray-400">{editSale.customer_name}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-orange-500">{editTotal.toFixed(2)} ₼</div>
                <div className="text-xs text-gray-400">cəmi</div>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Customer info */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Müştəri məlumatları</h3>
                <input value={editCustomer} onChange={e => setEditCustomer(e.target.value)}
                  placeholder="Müştəri adı"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="Telefon"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Items */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Məhsullar</h3>
                {editItems.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-red-50">✕</button>
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Say:</span>
                        <button onClick={() => updateQty(idx, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold">−</button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQty(idx, item.quantity + 1)} className="w-6 h-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-xs font-bold">+</button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400">Hədiyyə:</span>
                        <button onClick={() => updateGift(idx, (item.gift_quantity || 0) - 1)} className="w-6 h-6 rounded-lg bg-orange-100 hover:bg-orange-200 text-xs font-bold text-orange-600">−</button>
                        <span className="w-8 text-center text-sm font-semibold">{item.gift_quantity || 0}</span>
                        <button onClick={() => updateGift(idx, (item.gift_quantity || 0) + 1)} className="w-6 h-6 rounded-lg bg-orange-100 hover:bg-orange-200 text-xs font-bold text-orange-600">+</button>
                      </div>
                      <span className="ml-auto text-sm font-semibold text-orange-500">{(item.price * item.quantity).toFixed(2)} ₼</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add product */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Məhsul əlavə et</h3>
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Məhsul axtar..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {productSearch && (
                  <div className="space-y-1">
                    {filteredProducts.map(p => (
                      <button key={p.id} onClick={() => addProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-sm transition">
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className="text-orange-500 font-semibold">{p.price.toFixed(2)} ₼</span>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && <p className="text-xs text-gray-400 px-1">Tapılmadı</p>}
                  </div>
                )}
              </div>

              {/* Paid amount */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Ödəniş</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={editPaid}
                    onChange={e => setEditPaid(parseFloat(e.target.value) || 0)}
                    min={0}
                    max={editTotal}
                    step={0.01}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button onClick={() => setEditPaid(editTotal)}
                    className="px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl transition">
                    Tam ödəndi
                  </button>
                </div>
                {editTotal - editPaid > 0 && (
                  <p className="text-xs text-red-500">Borc: {(editTotal - editPaid).toFixed(2)} ₼</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 flex gap-3">
              {deleteConfirm ? (
                <>
                  <span className="text-sm text-red-600 flex-1 self-center font-medium">Silmək istəyirsiniz?</span>
                  <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition">Ləğv et</button>
                  <button onClick={deleteSale} disabled={saving} className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">Sil</button>
                </>
              ) : (
                <>
                  <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-500 text-sm font-semibold rounded-xl transition">🗑 Sil</button>
                  <button onClick={saveSale} disabled={saving || editItems.length === 0}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
                    {saving ? 'Saxlanılır...' : 'Saxla'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
