'use client';

import { useEffect, useState } from 'react';

interface CourierLocation {
  courier_id: number;
  courier_name?: string;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export default function CourierTrackingPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [sdkReady, setSdkReady] = useState(false);

  // Telegram SDK initialization
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserId(user.id);
        setUserName(`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || `ID: ${user.id}`);
      }
    }
    setSdkReady(true);
  }, []);

  // Avtomatik lokasiya yenilənməsi - hər 30 saniyədə bir
  useEffect(() => {
    if (!sdkReady || !userId) return;

    const updateLocation = () => {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setLocation(newLoc);
          sendLocation(newLoc);
        },
        (err) => {
          console.warn('Auto location error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // İlk dəfə dərhal çağır
    updateLocation();

    // Hər 30 saniyədə yenilə
    const interval = setInterval(updateLocation, 30000);

    return () => clearInterval(interval);
  }, [sdkReady, userId]);

  async function sendLocation(loc: { lat: number; lon: number }) {
    if (!userId) return;
    setSending(true);
    try {
      const res = await fetch('http://localhost:3000/api/courier/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier_id: userId,
          courier_name: userName,
          latitude: loc.lat,
          longitude: loc.lon
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLastUpdate(data.updated_at);
      }
    } catch (err) {
      console.error('Send location error:', err);
    } finally {
      setSending(false);
    }
  }

  function getLocation() {
    setLoading(true);
    setError('');
    
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setLocation(newLoc);
        sendLocation(newLoc);
        setLoading(false);
        
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.impactOccurred('medium');
        }
      },
      (err) => {
        setError('Məkan alına bilmədi. GPS icazəsini yoxlayın.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  if (!sdkReady) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-white">Yüklənir...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0f1a] text-white font-sans">
      <div className="max-w-md mx-auto p-6 pb-32">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">🚚</div>
            <div>
              <h1 className="text-xl font-black">Kuryer İzləmə</h1>
              <p className="text-xs text-gray-400">{userName || 'Kuryer'}</p>
            </div>
          </div>
        </header>

        {/* Status Card */}
        <div className="bg-[#1a1a2e] rounded-3xl border border-[#2d2d44] p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-400">Status:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${sending ? 'bg-yellow-500/20 text-yellow-400' : location ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {sending ? 'Göndərilir...' : location ? 'Aktiv' : 'Gözləyir'}
            </span>
          </div>
          
          {location && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Enlik:</span>
                  <span className="font-mono text-green-400">{location.lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Uzunluq:</span>
                  <span className="font-mono text-green-400">{location.lon.toFixed(6)}</span>
                </div>
              </div>
              
              {lastUpdate && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Son yenilənmə:</span>
                  <span className="text-gray-400">{new Date(lastUpdate).toLocaleTimeString('az-AZ')}</span>
                </div>
              )}
            </>
          )}
          
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
        </div>

        {/* Map Preview */}
        {location && (
          <div className="bg-[#1a1a2e] rounded-3xl border border-[#2d2d44] overflow-hidden mb-6">
            <div className="p-4 border-b border-[#2d2d44]">
              <h3 className="text-sm font-bold text-gray-400">Cari Lokasiya</h3>
            </div>
            <div className="relative h-48 bg-[#252540]">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.01},${location.lat - 0.01},${location.lon + 0.01},${location.lat + 0.01}&layer=mapnik&marker=${location.lat},${location.lon}`}
                title="Courier Location"
              />
            </div>
            <div className="p-4">
              <a 
                href={`https://www.google.com/maps?q=${location.lat},${location.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 bg-orange-500 text-white text-center rounded-xl text-sm font-bold active:scale-95"
              >
                Google Maps-də Aç
              </a>
            </div>
          </div>
        )}

        {/* Manual Update Button */}
        <button
          onClick={getLocation}
          disabled={loading}
          className="w-full py-4 bg-orange-500 text-white rounded-3xl text-base font-black shadow-lg shadow-orange-500/30 active:scale-95 disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'Məkan axtarılır...' : '📍 Lokasiyanı Yenilə'}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-[#1a1a2e] rounded-2xl border border-[#2d2d44]">
          <p className="text-xs text-gray-500 text-center">
            Lokasiyanız avtomatik olaraq hər 30 saniyədə bir yenilənir. Bu səhifəni açıq saxlayın.
          </p>
        </div>
      </div>
    </main>
  );
}