// Gemeinsame Hilfsfunktionen für beide API-Routen

const EC_URL = 'https://api.tech.ec.europa.eu/search-api/prod/rest/search';
const STATUS  = { '31094501': 'FORTHCOMING', '31094502': 'OPEN' };

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function ecSearch(text, pageSize, pageNumber, extraMust = []) {
  const query = {
    bool: {
      must: [
        { terms: { type: ['1', '2', '8'] } },
        { terms: { status: ['31094501', '31094502'] } },
        { term:  { language: 'en' } },
        ...extraMust,
      ],
    },
  };

  const form = new FormData();
  form.append('query', new Blob([JSON.stringify(query)], { type: 'application/json' }), 'query.json');

  const url = `${EC_URL}?apiKey=SEDIA` +
    `&text=${encodeURIComponent(text || '***')}` +
    `&pageSize=${pageSize}&pageNumber=${pageNumber}&language=en`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0',
      Origin: 'https://ec.europa.eu',
    },
    body: form,
  });

  if (!r.ok) throw new Error(`EC API ${r.status}: ${await r.text().then(t => t.slice(0, 200))}`);
  return r.json();
}

function normalizeHit(r) {
  const m = r.metadata || {};
  const a = k => Array.isArray(m[k]) ? m[k][0] : (m[k] ?? null);
  const id = a('identifier') || a('callIdentifier') || a('topicCode') || '';
  return {
    id,
    reference:   r.reference || null,
    title:       a('title') || r.summary || 'No title',
    programme:   id.split(/[-/]/)[0] || '',
    type:        a('typeOfAction') || a('fundingScheme') || null,
    status:      STATUS[a('status')] || 'UNKNOWN',
    deadline:    a('deadlineDate') || a('submissionDeadline') || null,
    startDate:   a('startDate') || a('openingDate') || null,
    budget:      a('budgetOverviewTotal') || a('indicativeBudget') || null,
    description: a('description') || r.content || null,
    url:         r.url ||
      `https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/topic-details/${id.toLowerCase()}`,
  };
}

function callHtml(c, i) {
  return `<article>
<h2>${i != null ? `${i + 1}. ` : ''}${c.title}</h2>
<p><b>ID:</b> ${c.id}</p>
<p><b>Programme:</b> ${c.programme || '—'} | <b>Type:</b> ${c.type || '—'} | <b>Status:</b> ${c.status}</p>
<p><b>Deadline:</b> ${c.deadline?.slice(0, 10) || '—'} | <b>Opens:</b> ${c.startDate?.slice(0, 10) || '—'}</p>
<p><b>Budget:</b> ${c.budget || '—'}</p>
<p><b>Description:</b> ${c.description || '—'}</p>
<p><b>Link:</b> <a href="${c.url}">${c.url}</a></p>
</article>`;
}

module.exports = { setCors, ecSearch, normalizeHit, callHtml };
