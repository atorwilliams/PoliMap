// ─────────────────────────────────────────────────────────────────────────────
// news.js – Alberta RSS feed loader for the Separatist Info news tab
// ─────────────────────────────────────────────────────────────────────────────

// ── Feed Configuration ────────────────────────────────────────────────────────
// Add your feeds here. Bias options:
//   'left' | 'centre-left' | 'centre' | 'centre-right' | 'right'
//
// Example entry:
//   { url: 'https://www.cbc.ca/cmlink/rss-canada-calgary', name: 'CBC Calgary', bias: 'centre-left' },

export const RSS_FEEDS = [
  // Independent editorial outlets
  { url: 'https://breachmedia.ca/feed/',             name: 'The Breach',         bias: 'left'         },
  { url: 'https://albertapolitics.ca/feed/',         name: 'Alberta Politics',   bias: 'left'         },
  { url: 'https://thenarwhal.ca/feed/',              name: 'The Narwhal',        bias: 'left'         },
  { url: 'https://daveberta.ca/feed/',               name: 'Daveberta',          bias: 'centre-left'  },
  { url: 'https://www.westernstandard.news/feed/',   name: 'Western Standard',   bias: 'right'        },
  { url: 'https://thepostmillennial.com/index.rss',  name: 'The Post Millennial',bias: 'right'        },
  { url: 'https://www.rebelnews.com/news.rss',       name: 'Rebel News',         bias: 'right'        },

  // Official party feeds
  { url: 'https://ndp.ca/rss.xml',                  name: 'NDP',                bias: 'centre-left',  partisan: true },
  { url: 'https://liberal.ca/feed/',                name: 'Liberal Party',      bias: 'centre',       partisan: true },
  { url: 'https://unitedconservativecaucus.ca/feed/',name: 'UCP Caucus',         bias: 'right',        partisan: true },

  // Corporate media (Global News, Calgary Herald, Edmonton Journal, Edmonton Sun)
  // block automated requests — removed to avoid 403 errors.
];

// ── Bias Display Config ───────────────────────────────────────────────────────
export const BIAS_CONFIG = {
  'left':         { label: 'Left',         color: '#d45555' },
  'centre-left':  { label: 'Centre-Left',  color: '#c47a30' },
  'centre':       { label: 'Centre',       color: '#777777' },
  'centre-right': { label: 'Centre-Right', color: '#4a7fc1' },
  'right':        { label: 'Right',        color: '#2255aa' },
};

// ── CORS Proxy ────────────────────────────────────────────────────────────────
// On Vercel (production), route through our own serverless function which
// fetches server-side — no CORS issues, no third-party blocks.
// Locally, fall back to public proxies since /api/proxy isn't running.
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

async function fetchRaw(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);

  if (!IS_LOCAL) {
    // Production: use our own Vercel proxy
    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(t);
    }
  }

  // Local dev: try public proxies
  clearTimeout(t);
  const tryProxy = async (proxyUrl, unwrap) => {
    const c = new AbortController();
    const pt = setTimeout(() => c.abort(), 7000);
    try {
      const res = await fetch(proxyUrl, { signal: c.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await unwrap(res);
      if (!text || text.trimStart().startsWith('<html') || text.trimStart().startsWith('<!')) {
        throw new Error('Got HTML instead of RSS');
      }
      const xml = new DOMParser().parseFromString(text, 'text/xml');
      if (xml.querySelector('parsererror')) throw new Error('Invalid XML from proxy');
      return text;
    } finally {
      clearTimeout(pt);
    }
  };

  try {
    return await tryProxy(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      r => r.json().then(d => d.contents)
    );
  } catch (_) {}

  return tryProxy(
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    r => r.text()
  );
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = null;

// ── Internal: fetch one feed ──────────────────────────────────────────────────
async function fetchFeed(feed) {
  const contents = await fetchRaw(feed.url);

  const xml = new DOMParser().parseFromString(contents, 'text/xml');

  const items = [...xml.querySelectorAll('item')];
  if (items.length === 0) throw new Error('No items in feed');

  const text = el => el?.textContent?.trim() || '';

  return items.slice(0, 20).map(item => {
    // Thumbnail: try media:content, then media:thumbnail, then enclosure
    const media = item.querySelector('content, thumbnail') ||
                  item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0] ||
                  item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail')[0];
    const enclosure = item.querySelector('enclosure');
    const thumbnail = media?.getAttribute('url') || enclosure?.getAttribute('url') || null;

    return {
      title:       text(item.querySelector('title')) || 'Untitled',
      description: stripHtml(text(item.querySelector('description'))).slice(0, 240).trim(),
      link:        text(item.querySelector('link')),
      pubDate:     text(item.querySelector('pubDate')),
      thumbnail,
      source:      feed.name,
      bias:        feed.bias,
      partisan:    feed.partisan || false,
    };
  });
}

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
}

// ── Public: load all feeds ────────────────────────────────────────────────────
export async function loadArticles() {
  if (cache) return cache;
  if (RSS_FEEDS.length === 0) return [];

  const results = await Promise.allSettled(RSS_FEEDS.map(fetchFeed));

  const articles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  const failedFeeds = RSS_FEEDS.filter((_, i) => results[i].status === 'rejected');
  if (failedFeeds.length > 0) {
    failedFeeds.forEach((feed) => {
      const reason = results[RSS_FEEDS.indexOf(feed)].reason;
      console.warn(`[News] "${feed.name}" failed:`, reason);
    });
    // Surface failed feed names in the UI
    const status = document.getElementById('news-status');
    if (status) {
      const names = failedFeeds.map(f => f.name).join(', ');
      status.innerHTML = `<p class="news-warn">Could not load: ${names}. These sources may be blocking the proxy.</p>`;
    }
  }

  articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  cache = articles;
  return articles;
}

// ── Date formatting ───────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Render helpers ────────────────────────────────────────────────────────────
function articleCard(article) {
  const bias  = BIAS_CONFIG[article.bias] || BIAS_CONFIG['centre'];
  const thumb = article.thumbnail
    ? `<img src="${article.thumbnail}" alt="" class="news-thumb" loading="lazy" onerror="this.style.display='none'">`
    : '';
  const desc  = article.description
    ? `<p class="news-excerpt">${article.description}${article.description.length >= 240 ? '…' : ''}</p>`
    : '';

  return `
    <article class="news-card">
      ${thumb}
      <div class="news-body">
        <div class="news-meta-row">
          <span class="news-source">${article.source}</span>
          ${article.partisan ? `<span class="partisan-tag">Official</span>` : ''}
          <span class="bias-pill" style="--bias-color:${bias.color}">${bias.label}</span>
          <span class="news-date">${timeAgo(article.pubDate)}</span>
        </div>
        <h3 class="news-title">${article.title}</h3>
        ${desc}
        <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="news-read-btn">Read →</a>
      </div>
    </article>`;
}

// ── Public: render articles into the DOM ──────────────────────────────────────
export function renderArticles(articles, biasFilter = 'all') {
  const grid   = document.getElementById('news-grid');
  const status = document.getElementById('news-status');
  if (!grid || !status) return;

  const filtered = biasFilter === 'all'
    ? articles
    : articles.filter(a => a.bias === biasFilter);

  status.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '';
    status.innerHTML = `<p class="news-empty">No articles found${biasFilter !== 'all' ? ' for this filter' : ''}.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(articleCard).join('');
}

// ── Public: loading / error / unconfigured states ─────────────────────────────
export function showLoading() {
  const grid   = document.getElementById('news-grid');
  const status = document.getElementById('news-status');
  if (!grid || !status) return;
  grid.innerHTML = '';
  status.innerHTML = `
    <div class="news-loading">
      <div class="news-spinner"></div>
      <p>Loading feeds…</p>
    </div>`;
}

export function showError(msg) {
  const status = document.getElementById('news-status');
  if (status) status.innerHTML = `<p class="news-error">${msg}</p>`;
}

export function showUnconfigured() {
  const grid   = document.getElementById('news-grid');
  const status = document.getElementById('news-status');
  if (!grid || !status) return;
  grid.innerHTML = '';
  status.innerHTML = `
    <div class="news-empty-state">
      <p class="news-empty-title">No feeds configured yet.</p>
      <p class="news-empty-sub">Open <code>news.js</code> and add entries to the <code>RSS_FEEDS</code> array to get started.</p>
    </div>`;
}
