/* Loads only the browser-safe Supabase settings from the root .env file. */
window.RM = window.RM || {};
RM.SUPABASE_CONFIG = {
  url: '',
  anonKey: '',
};

RM.loadSupabaseConfig = async function () {
  const response = await fetch(new URL('.env', document.baseURI), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`A .env fájl nem olvasható (${response.status}). HTTP-szerverről nyisd meg az oldalt.`);
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
