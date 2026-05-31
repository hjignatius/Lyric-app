// Vercel serverless function: loads a pCloud file fully server-side.
//
// pCloud CDN URLs returned by getfilelink are IP-locked to whoever called
// getfilelink. If the browser calls getfilelink and then tries to fetch the
// CDN URL, CORS blocks it. If a proxy fetches the CDN URL after the browser
// called getfilelink, the IPs don't match and pCloud returns "Invalid link
// referer". The only fix is to call getfilelink AND fetch the CDN URL from
// the same origin — i.e. entirely server-side here.

const ALLOWED_API_HOSTS = new Set(['api.pcloud.com', 'eapi.pcloud.com']);
const ALLOWED_PARAMS = new Set(['auth', 'access_token']);

export default async function handler(req, res) {
  const token = req.headers['authorization'];
  const { path, host, param } = req.query;

  if (!token || !path || !ALLOWED_API_HOSTS.has(host) || !ALLOWED_PARAMS.has(param)) {
    return res.status(400).json({ error: 'invalid request' });
  }

  try {
    const qs = new URLSearchParams({ [param]: token, path });
    const linkRes = await fetch(`https://${host}/getfilelink?${qs}`);
    const link = await linkRes.json();

    if (link.result !== 0) {
      return res.status(502).json({ error: link.error || `pCloud error ${link.result}` });
    }
    const cdnHost = link.hosts?.[0];
    if (!cdnHost) return res.status(502).json({ error: 'no CDN host' });

    const fileRes = await fetch(`https://${cdnHost}${link.path}`);
    if (!fileRes.ok) return res.status(fileRes.status).json({ error: `CDN HTTP ${fileRes.status}` });

    const body = await fileRes.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(body);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
