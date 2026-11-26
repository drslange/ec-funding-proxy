const { setCors, ecSearch, normalizeHit, callHtml } = require('./_shared');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'GET only' });

  const { id, format } = req.query;
  if (!id) return res.status(400).json({ error: 'Parameter "id" fehlt' });

  try {
    const data = await ecSearch(id, 5, 1);
    const hit  = (data.results || []).find(r => {
      const m   = r.metadata || {};
      const rid = Array.isArray(m.identifier) ? m.identifier[0] : null;
      return rid === id || r.reference === id;
    }) || (data.results || [])[0];

    if (!hit) {
      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(404).send(`<!DOCTYPE html><html><body><p>Call "${id}" not found.</p></body></html>`);
      }
      return res.status(404).json({ error: 'Not found' });
    }

    const c = normalizeHit(hit);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${c.title}</title></head><body>
<h1>EU Call Detail</h1>
${callHtml(c, null)}
</body></html>`);
    }

    return res.status(200).json(c);
  } catch (e) {
    return res.status(502).json({ error: 'EC API error', detail: e.message });
  }
};
