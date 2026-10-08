/* Loads browser-safe Supabase settings from Vercel runtime config or local .env. */
window.RM = window.RM || {};
RM.SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
};

RM.loadSupabaseConfig = async function () {
  let response;
  try {
    response = await fetch(new URL('/api/config', window.location.origin), { cache: 'no-store' });
    if (response.ok) {
      const config = await response.json();
      if (config.url && config.anonKey) {
        RM.SUPABASE_CONFIG = config;
        return;
      }
    }
  } catch { /* Helyi statikus szervernél nincs /api végpont, próbáljuk a .env fájlt. */ }

  try {
    response = await fetch(new URL('.env', document.baseURI), { cache: 'no-store' });
  } catch {
    throw new Error('Nem sikerült betölteni a Supabase-beállításokat. Vercelen állítsd be a projekt Environment Variables értékeit, helyben pedig indíts HTTP-szervert.');
  }
  if (!response.ok) {
    throw new Error(`A Supabase-beállítások nem tölthetők be (${response.status}). Vercelen ellenőrizd a NEXT_PUBLIC_SUPABASE_URL és NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY változókat, helyben pedig a .env fájlt.`);
  }

  const values = new Map();
  const allowed = new Set(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);
  const contents = (await response.text()).replace(/^\uFEFF/, '');
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || !allowed.has(match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }

  const url = values.get('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = values.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anonKey) {
    throw new Error('A .env fájlban add meg a NEXT_PUBLIC_SUPABASE_URL és NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY értékét.');
  }

  RM.SUPABASE_CONFIG = { url, anonKey };
};
