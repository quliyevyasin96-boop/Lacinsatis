'use client';

import { useEffect, useState, useRef } from 'react';

interface CourierLocation {
  courier_id: number;
  courier_name?: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export default function AdminTrackingPage() {
  const [couriers, setCouriers] = useState<CourierLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [selectedCourier, setSelectedCourier] = useState<CourierLocation | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Kuryerlərin lokasiyalarını gətir
  async function fetchLocations() {
    try {
      const res = await fetch('http://localhost:3000/api/courier/locations');
      if (res.ok) {
        const data = await res.json();
        setCouriers(data);
        setLastRefresh(new Date().toLocaleTimeString('az-AZ'));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // İlkin yükləmə
  useEffect(() => {
    fetchLocations();
  }, []);

  // Hər 10 saniyədə yenilə
  useEffect(() => {
    const interval = setInterval(fetchLocations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Vaxt fərqini hesabla
  function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} san əvvəl`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dəq əvvəl`;
    return `${Math.floor(minutes / 60)} saat əvvəl`;
  }

  // Aktiv say
  const activeCount = couriers.length;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 bg-[#0f0f1a] border-b border-[#2d2d44] z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">🗺️</div>
            <div>
              <h1 className="text-lg font-black">Kuryer İzləmə</h1>
              <p className="text-xs text-gray-400">Real vaxt izləmə</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-500/20 px-3 py-1 rounded-full">
              <span className="text-xs font-bold text-green-400">{activeCount} aktiv</span>
            </div>
            <button
              onClick={fetchLocations}
              className="p-2 bg-[#1a1a2e] rounded-xl border border-[#2d2d44] active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-[10px] text-gray-500 text-right">Son yenilənmə: {lastRefresh}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Xəritə */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-[#2d2d44] overflow-hidden">
          <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400">Xəritə</h3>
            {selectedCourier && (
              <button
                onClick={() => setSelectedCourier(null)}
                className="text-xs text-orange-400"
              >
                Xəritəni sıfırla
              </button>
            )}
          </div>
          <div 
            ref={mapContainerRef}
            className="relative w-full h-[400px] bg-[#252540]"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 text-sm">Yüklənir...</div>
              </div>
            ) : couriers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="text-5xl">📍</div>
                <p className="text-gray-400 text-sm text-center px-8">
                  Aktiv kuryer yoxdur. Kuryerlər izləmə səhifəsini açdıqda burada görünəcəklər.
                </p>
              </div>
            ) : (
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={selectedCourier 
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedCourier.longitude - 0.02},${selectedCourier.latitude - 0.02},${selectedCourier.longitude + 0.02},${selectedCourier.latitude + 0.02}&layer=mapnik&marker=${selectedCourier.latitude},${selectedCourier.longitude}`
                  : `https://www.openstreetmap.org/export/embed.html?bbox=${couriers.length > 0 ? `${Math.min(...couriers.map(c => c.longitude)) - 0.05},${Math.min(...couriers.map(c => c.latitude)) - 0.05},${Math.max(...couriers.map(c => c.longitude)) + 0.05},${Math.max(...couriers.map(c => c.latitude)) + 0.05}` : '44.5,40.3,44.6,40.5'}&layer=mapnik`
                }
                title="Courier Map"
              />
            )}
          </div>
          {/* Google Maps linkləri */}
          {couriers.length > 0 && (
            <div className="p-4 border-t border-[#2d2d44]">
              <a
                href={`https://www.google.com/maps/dir/${couriers.map(c => `${c.latitude},${c.longitude}`).join('/')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-blue-500 text-white text-center rounded-xl text-sm font-bold active:scale-95"
              >
                🗺️ Bütün Kuryerləri Marşrutla
              </a>
            </div>
          )}
        </div>

        {/* Kuryer Siyahısı */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aktiv Kuryerlər</h3>
          
          {couriers.length === 0 ? (
            <div className="bg-[#1a1a2e] rounded-3xl border border-[#2d2d44] p-8 text-center">
              <p className="text-gray-500 text-sm">Aktiv kuryer yoxdur</p>
            </div>
          ) : (
            couriers.map((courier) => (
              <div
                key={courier.courier_id}
                onClick={() => setSelectedCourier(courier)}
                className={`bg-[#1a1a2e] rounded-2xl border p-4 cursor-pointer transition-all active:scale-[0.98] ${
                  selectedCourier?.courier_id === courier.courier_id 
                    ? 'border-orange-500 shadow-lg shadow-orange-500/20' 
                    : 'border-[#2d2d44]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-lg">
                      🚚
                    </div>
                    <div>
                      <p className="font-bold text-sm">{courier.courier_name || `Kuryer #${courier.courier_id}`}</p>
                      <p className="text-[10px] text-gray-500 font-mono">
                        {courier.latitude.toFixed(5)}, {courier.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full">
                      Aktiv
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {getTimeAgo(courier.updated_at)}
                    </p>
                  </div>
                </div>
                
                {/* Əlavə məlumat */}
                <div className="mt-3 pt-3 border-t border-[#2d2d44]">
                  <a
                    href={`https://www.google.com/maps?q=${courier.latitude},${courier.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block w-full py-2 bg-[#252540] text-center rounded-xl text-xs font-bold text-orange-400 active:scale-95"
                  >
                    📍 Google Maps-də Göstər
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Məlumat */}
        <div className="p-4 bg-[#1a1a2e] rounded-2xl border border-[#2d2d44]">
          <p className="text-xs text-gray-500 text-center">
            Kuryerlər izləmə səhifəsini açdıqda avtomatik olaraq lokasiyaları burada görünür.
            Məlumatlar hər 10 saniyədə bir yenilənir.
          </p>
        </div>
      </div>
    </div>
  );
}