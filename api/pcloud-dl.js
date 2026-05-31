// Vercel serverless proxy for pCloud CDN downloads.
// Browsers can't fetch pCloud CDN URLs directly due to CORS; this proxy
// fetches them server-side and relays the content back.
// Only pCloud CDN hostnames (c<n>.pcloud.com) are allowed through.

const ALLOWED_HOST = /^c\d+\.pcloud\.com$/;

export default async function handler(req, res) {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'missing url' });
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOST.test(parsed.hostname)) {
    return res.status(403).json({ error: 'url not allowed' });
  }
  try {
    const upstream = await fetch(url);
    const body = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstream.status).send(body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
