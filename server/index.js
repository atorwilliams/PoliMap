'use strict';

/**
 * PoliMap API server
 * Proxies Google Civic Information API + OpenStates to avoid exposing keys
 * and to merge + normalise the responses.
 *
 * Port: 3002  (nginx proxies /api/officials → http://localhost:3002)
 *
 * Endpoint:
 *   GET /api/officials?lat=<lat>&lng=<lng>
 *
 * Env vars (required):
 *   GOOGLE_CIVIC_KEY   — Google Cloud project key with Civic Information API enabled
 *   OPENSTATES_KEY     — OpenStates API key (free tier at openstates.org/api/register/)
 *
 * Optional:
 *   PORT               — defaults to 3002
 */

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3002;

const GOOGLE_KEY     = process.env.GOOGLE_CIVIC_KEY    || '';
const OPENSTATES_KEY = process.env.OPENSTATES_KEY       || '';

app.use(cors({ origin: ['https://poli-map.org', 'http://localhost:*'] }));
app.use(express.json());

// ── Response transformers ─────────────────────────────────────────────────────

const LEVEL_ORDER = {
  country:             0,
  administrativeArea1: 1,
  administrativeArea2: 2,
  locality:            3,
  subLocality1:        4,
  subLocality2:        5,
  special:             6,
  regional:            7,
};

function transformCivic(data) {
  if (!data.offices || !data.officials) return [];

  const results = [];
  for (const office of data.offices) {
    const officials = (office.officialIndices || [])
      .map(i => data.officials[i])
      .filter(Boolean);
    if (!officials.length) continue;

    results.push({
      office:   office.name,
      level:    office.levels?.[0]   || 'regional',
      roles:    office.roles         || [],
      source:   'civic',
      officials: officials.map(o => ({
        name:   o.name,
        party:  o.party,
        phone:  o.phones?.[0]        || null,
        url:    o.urls?.[0]          || null,
        email:  o.emails?.[0]        || null,
        photo:  o.photoUrl           || null,
        address: o.address?.[0]?.locationName || null,
      })),
    });
  }

  results.sort((a, b) =>
    (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99)
  );
  return results;
}

function transformOpenStates(data) {
  if (!data.results) return [];

  return data.results.map(p => {
    const role   = p.current_role || {};
    const isUpper = role.org_classification === 'upper';
    return {
      office:   `${role.title || (isUpper ? 'State Senator' : 'State Representative')} — District ${role.district || '?'}`,
      level:    'administrativeArea1',
      roles:    [isUpper ? 'legislatorUpperBody' : 'legislatorLowerBody'],
      source:   'openstates',
      officials: [{
        name:   p.name,
        party:  p.party,
        phone:  null,
        url:    p.openstates_url || null,
        email:  p.email          || null,
        photo:  p.image          || null,
        address: null,
      }],
    };
  });
}

// Deduplicate: OpenStates state legislators supersede Civic API state legislators
// (OpenStates coverage is better at the state level)
function merge(civicEntries, osEntries) {
  const stateRoles = new Set(['legislatorUpperBody', 'legislatorLowerBody']);
  const filtered   = civicEntries.filter(
    e => !e.roles.some(r => stateRoles.has(r))
  );
  return [...filtered, ...osEntries].sort(
    (a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99)
  );
}

// ── /api/officials ────────────────────────────────────────────────────────────

app.get('/api/officials', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const address = `${lat},${lng}`;
  const results = { civic: [], openstates: [], merged: [], errors: [] };

  // Google Civic Information API
  if (GOOGLE_KEY) {
    try {
      const url  = `https://www.googleapis.com/civicinfo/v2/representatives?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const json = await resp.json();
      if (json.error) {
        results.errors.push(`Civic: ${json.error.message}`);
      } else {
        results.civic = transformCivic(json);
      }
    } catch (err) {
      results.errors.push(`Civic: ${err.message}`);
    }
  } else {
    results.errors.push('Civic: GOOGLE_CIVIC_KEY not set');
  }

  // OpenStates people.geo
  if (OPENSTATES_KEY) {
    try {
      const url  = `https://v3.openstates.org/people.geo?lat=${lat}&lng=${lng}&apikey=${OPENSTATES_KEY}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const json = await resp.json();
      if (json.detail) {
        results.errors.push(`OpenStates: ${json.detail}`);
      } else {
        results.openstates = transformOpenStates(json);
      }
    } catch (err) {
      results.errors.push(`OpenStates: ${err.message}`);
    }
  } else {
    results.errors.push('OpenStates: OPENSTATES_KEY not set');
  }

  results.merged = merge(results.civic, results.openstates);
  res.json(results);
});

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    ok:           true,
    google_civic: !!GOOGLE_KEY,
    openstates:   !!OPENSTATES_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`PoliMap API server running on port ${PORT}`);
  if (!GOOGLE_KEY)     console.warn('  ⚠  GOOGLE_CIVIC_KEY not set');
  if (!OPENSTATES_KEY) console.warn('  ⚠  OPENSTATES_KEY not set');
});
