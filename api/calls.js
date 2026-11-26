const { setCors, ecSearch, normalizeHit, callHtml } = require('./_shared');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'GET only' });

  const { q = '', pageSize = '20', pageNumber = '1', programme, format } = req.query;
  const ps = Math.min(Math.max(parseInt(pageSize)  || 20, 1), 100);
  const pn = Math.max(parseInt(pageNumber) || 1, 1);

  const extraMust = programme
    ? [{ prefix: { identifier: programme.toUpperCase() } }]
    : [];

  try {
    const data    = await ecSearch(q, ps, pn, extraMust);
    const results = (data.results || []).map(normalizeHit);
    const total   = data.totalResults || 0;

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>EU Calls</title></head><body>
<h1>EU Funding &amp; Tenders — Open Calls for Proposals</h1>
<p><b>Query:</b> "${q || '(all)'}" | <b>Programme:</b> ${programme || 'all'} | <b>Total results:</b> ${total} | <b>Showing:</b> ${results.length}</p>
${results.map((c, i) => callHtml(c, i)).join('\n')}
</body></html>`);
    }

    return res.status(200).json({ total, pageSize: ps, pageNumber: pn, results });
  } catch (e) {
    return res.status(502).json({ error: 'EC API error', detail: e.message });
  }
};
