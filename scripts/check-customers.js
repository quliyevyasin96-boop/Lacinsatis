// Mövcud customer-ləri yoxlamaq üçün
// cd frontend && npx ts-node --esm scripts/check-customers.ts

import { createClient } from '@upstash/redis';

const redis = createClient({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function main() {
  const data = await redis.get<string>('customers');
  const customers = typeof data === 'string' ? JSON.parse(data) : (Array.isArray(data) ? data : []);
  
  console.log(`\n📋 ÜMUMİ MÜŞTƏRİ SAYI: ${customers.length}\n`);
  console.log('━'.repeat(60));
  
  customers.forEach((c: any, i: number) => {
    console.log(`${i + 1}. ${c.name}`);
    console.log(`   📱 Telefon: ${c.phone || 'Yoxdur'}`);
    console.log(`   📍 Lokasiya: ${c.lat ? `${c.lat}, ${c.lon}` : 'Yoxdur'}`);
    console.log(`   🆔 ID: ${c.id}`);
    console.log(`   👤 Expert ID: ${c.expert_id || 'YOXDUR (köhnə)'}`);
    console.log(`   📅 Tarix: ${c.created_at}`);
    console.log('━'.repeat(60));
  });
}

main().catch(console.error);
