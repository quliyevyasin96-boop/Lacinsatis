'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  items?: { product_id: number; name: string; quantity: number; price: number }[];
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-1 shadow-sm">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
    ]).then(([s, e]) => {
      setSales(Array.isArray(s) ? s : []);
      setExpenses(Array.isArray(e) ? e : []);
      setLoading(false);
    });
  }, []);

  const totalRevenue = sales.reduce((a, s) => a + s.total_amount, 0);
  const totalPaid = sales.reduce((a, s) => a + (s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0)), 0);
  const totalDebt = totalRevenue - totalPaid;
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = sales.filter(s => (s.date || s.created_at || '').slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((a, s) => a + s.total_amount, 0);

  const recent = [...sales]
    .sort((a, b) => new Date(b.created_at || b.date || '').getTime() - new Date(a.created_at || a.date || '').getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Ümumi Satış" value={`${totalRevenue.toFixed(2)} ₼`} sub={`${sales.length} sifariş`} color="text-gray-900" />
        <KpiCard label="Bu gün" value={`${todayRevenue.toFixed(2)} ₼`} sub={`${todaySales.length} sifariş`} color="text-orange-500" />
        <KpiCard label="Ümumi Borc" value={`${totalDebt.toFixed(2)} ₼`} sub="ödənilməmiş" color="text-red-500" />
        <KpiCard label="Xərclər" value={`${totalExpenses.toFixed(2)} ₼`} sub={`${expenses.length} qeyd`} color="text-purple-500" />
      </div>

      {/* Kuryer İzləmə */}
      <Link href="/admin/tracking">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer active:scale-[0.98]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🗺️</div>
            <div>
              <h3 className="text-white font-black text-base">Kuryer İzləmə</h3>
              <p className="text-orange-100 text-xs">Ekspeditorların real vaxt lokasiyası</p>
            </div>
          </div>
          <div className="text-white text-2xl">→</div>
        </div>
      </Link>

      {/* Recent sales table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Son Satışlar</h2>
          <Link href="/admin/sales" className="text-xs text-orange-500 font-semibold hover:underline">
            Hamısına bax →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Müştəri</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tarix</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Məbləğ</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recent.map(s => {
                const debt = s.total_amount - (s.paid_amount ?? (s.payment_status === 'paid' ? s.total_amount : 0));
                const isPaid = debt <= 0;
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{s.customer_name}</td>
                    <td className="px-5 py-3 text-gray-500">{(s.date || s.created_at || '').slice(0, 10)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{s.total_amount.toFixed(2)} ₼</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {isPaid ? 'Ödənilib' : `${debt.toFixed(2)} ₼ borc`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setSelectedReceipt(s)}
                        className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition">
                        🧾 Çek
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">Satış yoxdur</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200 print:bg-white print:p-0">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-full">
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
                  <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span>{item.name} x {item.quantity} <span className="text-[10px] text-gray-500">({item.price.toFixed(2)} ₼)</span></span>
                    <span className="font-bold">{(item.price * item.quantity).toFixed(2)} ₼</span>
                  </div>
                ))}
                {!selectedReceipt.items || selectedReceipt.items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">Məhsul məlumatı yoxdur</p>
                ) : null}
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
              <button onClick={() => window.print()} className="bg-green-600 text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 w-full">🖨️ Çap Et</button>
              <button onClick={() => setSelectedReceipt(null)} className="bg-gray-800 text-white py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 w-full">Bağla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
