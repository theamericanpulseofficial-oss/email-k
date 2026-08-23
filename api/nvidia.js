// Vercel serverless function — proxies requests to NVIDIA NIM (integrate.api.nvidia.com)
// so the browser talks to our own domain (no CORS issue) instead of calling NVIDIA directly.
// The NVIDIA API key is sent by the browser in the Authorization header and just forwarded
// here — it is NOT stored on the server.

module.exports = async (req, res) => {
  // Allow simple CORS too, in case this proxy is ever called from another origin/testing.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const path = (req.query.path || 'chat/completions').replace(/^\/+/, '');
  const url = `https://integrate.api.nvidia.com/v1/${path}`;
  const auth = req.headers.authorization;

  if (!auth) {
    res.status(401).json({ error: { message: 'Missing Authorization header (NVIDIA API key)' } });
    return;
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: { message: 'Proxy error: ' + e.message } });
  }
};
      
