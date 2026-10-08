/* Vercel serverless endpoint: only return the intentionally public Supabase client config. */
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    return res.status(503).json({ error: 'Supabase browser environment variables are not configured.' });
  }

  return res.status(200).json({ url, anonKey });
};
