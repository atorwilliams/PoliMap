// contribute.js — Contribute page logic
// Handles: wallet connection, tab switching, proposal feed, propose flow, my activity

// ── Flair tier config (mirrors SPEC.md) ─────────────────────────────────────

const FLAIR_TIERS = [
  { min: 500, label: 'Elder',       cssClass: 'tier-5' },
  { min: 200, label: 'Minister',    cssClass: 'tier-4' },
  { min: 50,  label: 'Councillor',  cssClass: 'tier-3' },
  { min: 10,  label: 'Delegate',    cssClass: 'tier-2' },
  { min: 1,   label: 'Constituent', cssClass: 'tier-1' },
];

function flairForCount(count) {
  for (const tier of FLAIR_TIERS) {
    if (count >= tier.min) return tier;
  }
  return null;
}

function nextTierFor(count) {
  const tiers = [...FLAIR_TIERS].reverse();
  for (const tier of tiers) {
    if (count < tier.min) return tier;
  }
  return null;
}

// ── Wallet state ─────────────────────────────────────────────────────────────

let walletAddress  = null;
let walletTokens   = 0;
let walletStrikes  = 0;

async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask is not installed. Please install it to contribute.');
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (accounts.length) onWalletConnected(accounts[0]);
  } catch (err) {
    console.warn('[Contribute] Wallet connect rejected:', err);
  }
}

function disconnectWallet() {
  walletAddress = null;
  walletTokens  = 0;
  walletStrikes = 0;
  renderWalletBar();
  renderMyActivity();
}

async function onWalletConnected(address) {
  walletAddress = address;
  // TODO: fetch token balance from Base contract via eth_call
  // TODO: fetch strike count from API
  walletTokens  = 0;
  walletStrikes = 0;
  renderWalletBar();
  renderMyActivity();
}

function shortAddress(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
}

function renderWalletBar() {
  const disconnected = document.getElementById('wallet-disconnected');
  const connected    = document.getElementById('wallet-connected');
  if (!disconnected || !connected) return;

  if (!walletAddress) {
    disconnected.style.display = 'flex';
    connected.style.display    = 'none';
    return;
  }

  disconnected.style.display = 'none';
  connected.style.display    = 'flex';

  document.getElementById('wallet-address-display').textContent = shortAddress(walletAddress);
  document.getElementById('wallet-token-display').textContent   = `${walletTokens} token${walletTokens !== 1 ? 's' : ''}`;

  const flairEl = document.getElementById('wallet-flair-display');
  const flair   = flairForCount(walletTokens);
  if (flair) {
    flairEl.textContent = flair.label;
    flairEl.className   = `wallet-flair-badge ${flair.cssClass}`;
    flairEl.style.display = '';
  } else {
    flairEl.style.display = 'none';
  }

  const strikeEl = document.getElementById('wallet-strike-display');
  if (walletStrikes > 0) {
    strikeEl.textContent    = `${walletStrikes} strike${walletStrikes !== 1 ? 's' : ''}`;
    strikeEl.style.display  = '';
  } else {
    strikeEl.style.display = 'none';
  }

  // Show wallet gate panels where needed
  document.getElementById('mine-wallet-gate')?.style?.setProperty('display', 'none');
  document.getElementById('mine-content')?.style?.setProperty('display', 'block');
}

// ── Tab switching ─────────────────────────────────────────────────────────────

function switchTab(tabKey) {
  document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById(`tab-${tabKey}`);
  const btn   = document.querySelector(`.sub-nav-btn[data-tab="${tabKey}"]`);
  if (panel) panel.style.display = 'block';
  if (btn)   btn.classList.add('active');
}

// ── Proposals feed ────────────────────────────────────────────────────────────

let allProposals   = [];
let activeFilter   = 'all';

async function loadProposals() {
  // TODO: replace with real API call
  // const res = await fetch('/api/proposals');
  // allProposals = await res.json();
  allProposals = [];
  renderProposals();
}

function renderProposals() {
  const list  = document.getElementById('proposals-list');
  const empty = document.getElementById('proposals-empty');
  const count = document.getElementById('proposal-count');
  if (!list) return;

  const filtered = activeFilter === 'all'
    ? allProposals
    : allProposals.filter(p => p.category === activeFilter);

  count.textContent = `${filtered.length} active`;

  // Clear non-empty-state children
  list.querySelectorAll('.proposal-card').forEach(c => c.remove());

  if (!filtered.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const tpl = document.getElementById('proposal-card-tpl');
  filtered.forEach(proposal => {
    const clone = tpl.content.cloneNode(true);
    const card  = clone.querySelector('.proposal-card');

    card.querySelector('.proposal-card-stripe').classList.add(proposal.category);
    card.querySelector('.proposal-category-badge').textContent = proposal.category;
    card.querySelector('.proposal-category-badge').classList.add(proposal.category);
    card.querySelector('.proposal-entity').textContent      = proposal.entity;
    card.querySelector('.proposal-field-label').textContent = proposal.field;
    card.querySelector('.diff-old').textContent             = proposal.currentValue || '—';
    card.querySelector('.diff-new').textContent             = proposal.proposedValue;

    const pct  = Math.min((proposal.votePoints / 8) * 100, 100);
    card.querySelector('.proposal-progress-fill').style.width = `${pct}%`;
    card.querySelector('.proposal-progress-label').textContent =
      `${proposal.votePoints.toFixed(1)} / 8 pts`;

    const days    = Math.ceil((proposal.expiresAt - Date.now()) / 86400000);
    card.querySelector('.proposal-time').textContent =
      days > 0 ? `${days}d remaining` : 'Expiring soon';

    const confirmBtn = card.querySelector('.confirm-btn');
    const reportBtn  = card.querySelector('.report-btn');

    if (!walletAddress) {
      confirmBtn.disabled = true;
      confirmBtn.title    = 'Connect wallet to confirm';
    } else {
      confirmBtn.addEventListener('click', () => confirmProposal(proposal._id, confirmBtn));
    }

    reportBtn.addEventListener('click', () => reportProposal(proposal._id, reportBtn));

    list.appendChild(clone);
  });
}

async function confirmProposal(id, btn) {
  if (!walletAddress) return;
  btn.disabled    = true;
  btn.textContent = '...';
  try {
    const msg = `PoliMap confirm proposal ${id}`;
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress],
    });
    // TODO: POST /api/proposals/:id/vote with { wallet: walletAddress, sig }
    console.log('[Contribute] Vote signed:', sig);
    btn.textContent = 'Confirmed ✓';
  } catch (err) {
    console.warn('[Contribute] Confirm failed:', err);
    btn.disabled    = false;
    btn.textContent = 'Confirm';
  }
}

async function reportProposal(id, btn) {
  if (!walletAddress) {
    alert('Connect your wallet to report a proposal.');
    return;
  }
  if (!confirm('Report this proposal as spam? This action is logged against your wallet.')) return;
  btn.disabled    = true;
  btn.textContent = '...';
  try {
    const msg = `PoliMap report spam ${id}`;
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress],
    });
    // TODO: POST /api/proposals/:id/report with { wallet: walletAddress, sig }
    console.log('[Contribute] Report signed:', sig);
    btn.textContent = 'Reported';
  } catch (err) {
    console.warn('[Contribute] Report failed:', err);
    btn.disabled    = false;
    btn.textContent = 'Report Spam';
  }
}

// ── Propose flow — registry-driven drill-down ─────────────────────────────────

let registry      = [];
let drillSource   = null;   // currently selected source config
let drillEntries  = [];     // full list of entries for current source
let drillEntry    = null;   // currently selected entry object

// Flatten a nested record into { "dot.key": "value" } pairs.
// Arrays of objects are recursed with [n] indices; arrays of primitives are skipped.
function flattenRecord(obj, excluded = [], prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (excluded.includes(k) || excluded.includes(fullKey)) continue;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      result[fullKey] = String(v ?? '');
    } else if (Array.isArray(v)) {
      // Recurse into arrays of objects; skip arrays of primitives
      v.forEach((item, i) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(result, flattenRecord(item, excluded, `${fullKey}[${i}]`));
        }
      });
    } else if (typeof v === 'object') {
      Object.assign(result, flattenRecord(v, excluded, fullKey));
    }
  }
  return result;
}

// Derive an array of { key, label, sublabel, record } from a source definition
async function loadSourceEntries(source) {
  if (source.type === 'keyed-object') {
    const data    = await fetch(source.file).then(r => r.json());
    const obj     = source.entriesAt ? data[source.entriesAt] : data;
    return Object.entries(obj).map(([key, val]) => {
      const record   = source.recordAt ? val[source.recordAt] : val;
      const sublabel = [record?.[source.displayName], record?.[source.displaySub]]
        .filter(Boolean).join(' · ');
      return { key, label: key, sublabel, record };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }

  if (source.type === 'array') {
    const data = await fetch(source.file).then(r => r.json());
    const arr  = source.entriesAt ? data[source.entriesAt] : data;
    return arr.map(item => ({
      key:      item[source.displayName],
      label:    item[source.displayName],
      sublabel: '',
      record:   item,
    })).sort((a, b) => a.label.localeCompare(b.label));
  }

  if (source.type === 'directory') {
    const index = await fetch(source.indexFile).then(r => r.json());
    return Object.entries(index).map(([geoname, meta]) => {
      const label = toTitleCase(meta.slug?.replace(/-/g, ' ') || geoname);
      return {
        key:      geoname,
        label,
        sublabel: meta.type || '',
        slug:     meta.slug,
        record:   null, // loaded lazily
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }

  return [];
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Load the actual editable record for a directory entry (lazy)
async function resolveDirectoryRecord(source, entry) {
  if (entry.record) return entry.record;
  const url    = source.dataPattern.replace('{slug}', entry.slug);
  const data   = await fetch(url).then(r => r.json()).catch(() => null);
  entry.record = data;
  return data;
}

// ── Drill UI ──────────────────────────────────────────────────────────────────

function showDrillLevel(id) {
  ['drill-sources', 'drill-entries', 'drill-fields'].forEach(panelId => {
    const el = document.getElementById(panelId);
    if (el) el.style.display = panelId === id ? 'block' : 'none';
  });
}

async function initProposeTab() {
  try {
    registry = await fetch('/json/contribute-registry.json').then(r => r.json());
  } catch {
    document.getElementById('source-list').innerHTML =
      '<div class="drill-loading">Failed to load registry.</div>';
    return;
  }

  const list = document.getElementById('source-list');
  list.innerHTML = '';
  registry.forEach(source => {
    const row = document.createElement('div');
    row.className = 'source-row';
    row.innerHTML = `<span>${source.label}</span><span class="source-row-arrow">›</span>`;
    row.addEventListener('click', () => openSource(source));
    list.appendChild(row);
  });
}

async function openSource(source) {
  drillSource  = source;
  drillEntries = [];

  document.getElementById('drill-source-label').textContent = source.label;
  document.getElementById('entry-list').innerHTML            = '<div class="drill-loading">Loading…</div>';
  document.getElementById('drill-search').value             = '';
  showDrillLevel('drill-entries');

  try {
    drillEntries = await loadSourceEntries(source);
    renderEntryList(drillEntries);
  } catch (err) {
    document.getElementById('entry-list').innerHTML =
      '<div class="drill-empty">Failed to load entries.</div>';
    console.warn('[Contribute]', err);
  }
}

function renderEntryList(entries) {
  const list = document.getElementById('entry-list');
  if (!entries.length) {
    list.innerHTML = '<div class="drill-empty">No entries found.</div>';
    return;
  }
  list.innerHTML = '';
  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'entry-row';
    row.innerHTML = `
      <span class="entry-row-name">${entry.label}</span>
      ${entry.sublabel ? `<span class="entry-row-sub">${entry.sublabel}</span>` : ''}
    `;
    row.addEventListener('click', () => openEntry(entry));
    list.appendChild(row);
  });
}

async function openEntry(entry) {
  drillEntry = entry;
  document.getElementById('drill-entry-label').textContent = entry.label;
  document.getElementById('field-editor').innerHTML        = '<div class="drill-loading">Loading…</div>';
  showDrillLevel('drill-fields');

  let record = entry.record;
  if (!record && drillSource.type === 'directory') {
    record = await resolveDirectoryRecord(drillSource, entry);
  }

  if (!record) {
    document.getElementById('field-editor').innerHTML =
      '<div class="drill-empty">No data available for this entry.</div>';
    return;
  }

  renderFieldEditor(record, drillSource.excludeFields || []);
}

// Build a single editable field row
function makeFieldRow(fullKey, value, displayKey) {
  const row = document.createElement('div');
  row.className   = 'field-row';
  row.dataset.key = fullKey;
  row.innerHTML = `
    <span class="field-row-key">${escHtml(displayKey || fullKey)}</span>
    <span class="field-row-value" title="${escHtml(value)}">${escHtml(value) || '<span class="field-empty">empty</span>'}</span>
    <button class="field-edit-btn">Edit</button>
  `;
  row.querySelector('.field-edit-btn').addEventListener('click', () => {
    openInlineEdit(row, fullKey, value);
  });
  return row;
}

// Main entry point — takes raw record, renders everything recursively
function renderFieldEditor(record, excluded = []) {
  const editor = document.getElementById('field-editor');
  editor.innerHTML = '';
  if (!record || !Object.keys(record).length) {
    editor.innerHTML = '<div class="drill-empty">No editable fields.</div>';
    return;
  }
  renderRecordFields(record, excluded, '', editor);
}

// Recursive renderer: handles scalars, nested objects, and arrays
function renderRecordFields(record, excluded, prefix, container) {
  for (const [k, v] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (excluded.includes(k) || excluded.includes(fullKey)) continue;

    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      container.appendChild(makeFieldRow(fullKey, String(v ?? ''), fullKey));

    } else if (Array.isArray(v)) {
      const objItems = v.filter(item => item && typeof item === 'object' && !Array.isArray(item));
      // Show section for arrays of objects AND for empty arrays (so users can add)
      if (v.length === 0 || objItems.length > 0) {
        renderArraySection(fullKey, k, objItems, excluded, container);
      }
      // arrays of primitives (e.g. committees): skip

    } else if (typeof v === 'object') {
      // Recurse into nested objects — renders their contents at the same level
      renderRecordFields(v, excluded, fullKey, container);
    }
  }
}

// Render one array as a labelled section with per-item rows + an Add button
function renderArraySection(fullKey, label, items, excluded, container) {
  const sectionHeader = document.createElement('div');
  sectionHeader.className   = 'field-section-header';
  sectionHeader.textContent = toTitleCase(label);
  container.appendChild(sectionHeader);

  items.forEach((item, i) => {
    const personName = typeof item.name === 'string' ? item.name : null;
    if (personName !== null) {
      const ph = document.createElement('div');
      ph.className   = 'field-person-header';
      ph.textContent = personName || `Entry ${i + 1}`;
      container.appendChild(ph);
    }
    for (const [fk, fv] of Object.entries(item)) {
      const itemKey = `${fullKey}[${i}].${fk}`;
      if (excluded.includes(fk) || excluded.includes(itemKey)) continue;
      if (fv === null || typeof fv === 'string' || typeof fv === 'number' || typeof fv === 'boolean') {
        container.appendChild(makeFieldRow(itemKey, String(fv ?? ''), fk));
      }
      // nested arrays/objects within items: skip for now
    }
  });

  // "Add" button — infer template from first existing item, or use empty object
  const template = items[0]
    ? Object.fromEntries(
        Object.entries(items[0])
          .filter(([fk, fv]) => !excluded.includes(fk) &&
            (fv === null || typeof fv === 'string' || typeof fv === 'number'))
          .map(([fk]) => [fk, ''])
      )
    : null;

  container.appendChild(makeAddButton(fullKey, label, template));
}

// "Add new …" button that expands to an inline form
function makeAddButton(arrayPath, label, template) {
  const wrap = document.createElement('div');
  wrap.className = 'field-add-wrap';

  const btn = document.createElement('button');
  btn.className   = 'field-add-btn';
  btn.textContent = `+ Add ${toTitleCase(label.replace(/s$/, ''))}`;

  btn.addEventListener('click', () => {
    wrap.replaceWith(makeAddForm(arrayPath, label, template, wrap));
  });

  wrap.appendChild(btn);
  return wrap;
}

// Inline form for adding a new array item
function makeAddForm(arrayPath, label, template, originalWrap) {
  const form = document.createElement('div');
  form.className = 'field-add-form';

  const title = document.createElement('div');
  title.className   = 'field-add-form-title';
  title.textContent = `New ${toTitleCase(label.replace(/s$/, ''))}`;
  form.appendChild(title);

  const fieldsDiv = document.createElement('div');
  fieldsDiv.className = 'field-add-fields';

  const inputs = {};

  if (template && Object.keys(template).length) {
    for (const key of Object.keys(template)) {
      const row = document.createElement('div');
      row.className = 'field-add-row';
      row.innerHTML = `
        <label class="field-add-label">${escHtml(key)}</label>
        <input class="field-inline-input" type="text" data-field="${escHtml(key)}" placeholder="" />
      `;
      fieldsDiv.appendChild(row);
      inputs[key] = row.querySelector('input');
    }
  } else {
    // No template — show a free-form name field at minimum
    const row = document.createElement('div');
    row.className = 'field-add-row';
    row.innerHTML = `
      <label class="field-add-label">name</label>
      <input class="field-inline-input" type="text" data-field="name" placeholder="Full name" />
    `;
    fieldsDiv.appendChild(row);
    inputs['name'] = row.querySelector('input');
  }

  form.appendChild(fieldsDiv);

  const actions = document.createElement('div');
  actions.className = 'field-inline-actions';

  const submitBtn = document.createElement('button');
  submitBtn.className   = 'field-submit-btn';
  submitBtn.textContent = 'Submit Proposal';
  submitBtn.disabled    = !walletAddress;

  const cancelBtn = document.createElement('button');
  cancelBtn.className   = 'field-cancel-btn';
  cancelBtn.textContent = 'Cancel';

  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);

  if (!walletAddress) {
    const note = document.createElement('span');
    note.className   = 'field-wallet-note';
    note.textContent = 'Connect wallet to submit.';
    actions.appendChild(note);
  }

  form.appendChild(actions);

  cancelBtn.addEventListener('click', () => form.replaceWith(originalWrap));
  submitBtn.addEventListener('click', () =>
    submitAddProposal(arrayPath, inputs, submitBtn, form, originalWrap)
  );

  return form;
}

async function submitAddProposal(arrayPath, inputs, btn, form, originalWrap) {
  if (!walletAddress) return;

  const newItem = {};
  for (const [key, input] of Object.entries(inputs)) {
    newItem[key] = input.value.trim();
  }

  btn.disabled    = true;
  btn.textContent = 'Signing…';

  const payload = {
    sourceId:  drillSource.id,
    entryKey:  drillEntry.key,
    operation: 'add',
    arrayPath,
    newItem,
    wallet:    walletAddress,
  };

  try {
    const msg = `PoliMap add: ${JSON.stringify(payload)}`;
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress],
    });
    // TODO: POST /api/proposals with { ...payload, sig }
    console.log('[Contribute] Add proposal signed:', sig, payload);
    btn.textContent = 'Submitted ✓';
    setTimeout(() => form.replaceWith(originalWrap), 1000);
  } catch (err) {
    console.warn('[Contribute] Add failed:', err);
    btn.disabled    = false;
    btn.textContent = 'Submit Proposal';
  }
}

function openInlineEdit(row, key, currentValue) {
  // Close any already-open inline editor
  document.querySelectorAll('.field-inline-edit').forEach(el => {
    const orig = el._originalRow;
    if (orig) el.replaceWith(orig);
    else el.remove();
  });

  const inline = document.createElement('div');
  inline.className    = 'field-inline-edit';
  inline._originalRow = row;

  const walletNote = !walletAddress
    ? '<span class="field-wallet-note">Connect your wallet to submit.</span>'
    : '';

  inline.innerHTML = `
    <span class="field-inline-key">${key}</span>
    ${currentValue ? `<span class="field-inline-old">${escHtml(currentValue)}</span>` : ''}
    <input class="field-inline-input" type="text" placeholder="Enter correct value…" />
    <div class="field-inline-actions">
      <button class="field-submit-btn" disabled>Submit Proposal</button>
      <button class="field-cancel-btn">Cancel</button>
      ${walletNote}
    </div>
  `;

  const input     = inline.querySelector('.field-inline-input');
  const submitBtn = inline.querySelector('.field-submit-btn');
  const cancelBtn = inline.querySelector('.field-cancel-btn');

  input.addEventListener('input', () => {
    const val = input.value.trim();
    submitBtn.disabled = !val || val === currentValue || !walletAddress;
  });

  submitBtn.addEventListener('click', () =>
    submitProposal(key, currentValue, input.value.trim(), submitBtn, inline, row)
  );

  cancelBtn.addEventListener('click', () => inline.replaceWith(row));

  row.replaceWith(inline);
  input.focus();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function submitProposal(field, currentValue, proposedValue, btn, inline, originalRow) {
  if (!walletAddress) return;

  btn.disabled    = true;
  btn.textContent = 'Signing…';

  const payload = {
    sourceId:      drillSource.id,
    entryKey:      drillEntry.key,
    field,
    currentValue,
    proposedValue,
    wallet:        walletAddress,
  };

  try {
    const msg = `PoliMap propose: ${JSON.stringify(payload)}`;
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress],
    });

    // TODO: POST /api/proposals with { ...payload, sig }
    console.log('[Contribute] Proposal signed:', sig, payload);

    btn.textContent  = 'Submitted ✓';
    btn.style.background = '#1a6e3c';

    // Update the displayed value optimistically and restore row
    setTimeout(() => {
      originalRow.querySelector('.field-row-value').textContent = proposedValue;
      originalRow.querySelector('.field-row-value').title       = proposedValue;
      inline.replaceWith(originalRow);
    }, 1000);

  } catch (err) {
    console.warn('[Contribute] Submit failed:', err);
    btn.disabled    = false;
    btn.textContent = 'Submit Proposal';
  }
}

// ── My Activity ───────────────────────────────────────────────────────────────

function renderMyActivity() {
  const gate    = document.getElementById('mine-wallet-gate');
  const content = document.getElementById('mine-content');
  if (!gate || !content) return;

  if (!walletAddress) {
    gate.style.display    = '';
    content.style.display = 'none';
    return;
  }
  gate.style.display    = 'none';
  content.style.display = 'block';

  // Token count
  document.getElementById('mine-token-count').textContent = walletTokens;

  // Flair
  const flairEl = document.getElementById('mine-flair-badge');
  const flair   = flairForCount(walletTokens);
  if (flair) {
    flairEl.textContent = flair.label;
    flairEl.className   = `mine-flair ${flair.cssClass}`;
  } else {
    flairEl.textContent = 'No tier yet';
    flairEl.className   = 'mine-flair';
  }

  // Next tier progress
  const next    = nextTierFor(walletTokens);
  const nextEl  = document.getElementById('mine-next-tier');
  nextEl.textContent = next
    ? `${next.min - walletTokens} more token${next.min - walletTokens !== 1 ? 's' : ''} to reach ${next.label}`
    : 'Maximum tier reached';

  // Strike pips
  const pipsEl = document.getElementById('strike-pips');
  pipsEl.innerHTML = [1, 2, 3].map(i =>
    `<div class="strike-pip ${walletStrikes >= i ? 'active' : ''}"></div>`
  ).join('');

  document.getElementById('mine-strikes').textContent = `${walletStrikes} / 3`;

  const strikeNote = document.getElementById('strikes-note');
  const redeemBtn  = document.getElementById('redeem-btn');
  if (walletStrikes === 0) {
    strikeNote.textContent   = 'No strikes. Keep up the good work.';
    redeemBtn.style.display  = 'none';
  } else if (walletStrikes === 1) {
    strikeNote.textContent  = 'Warning issued. Burn 5 post-strike tokens to clear.';
    redeemBtn.style.display = walletTokens >= 5 ? '' : 'none';
  } else if (walletStrikes === 2) {
    strikeNote.textContent  = '1 token burned as penalty. Burn 5 post-strike tokens to clear a strike.';
    redeemBtn.style.display = walletTokens >= 5 ? '' : 'none';
  } else {
    strikeNote.textContent  = 'Wallet blacklisted from proposing. Contact an admin to appeal.';
    redeemBtn.style.display = 'none';
  }

  // TODO: load and render mine-proposals and mine-votes from API
}

async function redeemStrike() {
  if (!walletAddress || walletTokens < 5) return;
  const btn = document.getElementById('redeem-btn');
  btn.disabled    = true;
  btn.textContent = '...';
  try {
    const msg = `PoliMap redeem strike for ${walletAddress}`;
    const sig = await window.ethereum.request({
      method: 'personal_sign',
      params: [msg, walletAddress],
    });
    // TODO: POST /api/strikes/redeem with { wallet: walletAddress, sig }
    console.log('[Contribute] Redemption signed:', sig);
    btn.textContent = 'Redemption submitted ✓';
  } catch (err) {
    console.warn('[Contribute] Redemption failed:', err);
    btn.disabled    = false;
    btn.textContent = 'Redeem Strike (burn 5 tokens)';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Wallet buttons
  document.getElementById('connect-wallet-btn')?.addEventListener('click', connectWallet);
  document.getElementById('disconnect-wallet-btn')?.addEventListener('click', disconnectWallet);
  document.getElementById('mine-connect-btn')?.addEventListener('click', connectWallet);

  // Listen for account changes in MetaMask
  window.ethereum?.on('accountsChanged', accounts => {
    if (accounts.length) onWalletConnected(accounts[0]);
    else disconnectWallet();
  });

  // Tab switching
  document.querySelectorAll('.sub-nav-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // CTA button in empty state (switch to propose tab and reset to source list)
  document.querySelector('.cta-btn[data-goto-tab]')?.addEventListener('click', function () {
    switchTab(this.dataset.gotoTab);
    showDrillLevel('drill-sources');
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderProposals();
    });
  });

  // Propose drill-down navigation
  document.getElementById('back-to-sources')?.addEventListener('click', () => {
    showDrillLevel('drill-sources');
  });

  document.getElementById('back-to-entries')?.addEventListener('click', () => {
    showDrillLevel('drill-entries');
  });

  // Entry search filter
  document.getElementById('drill-search')?.addEventListener('input', function () {
    const q       = this.value.trim().toLowerCase();
    const filtered = q
      ? drillEntries.filter(e =>
          e.label.toLowerCase().includes(q) || e.sublabel.toLowerCase().includes(q)
        )
      : drillEntries;
    renderEntryList(filtered);
  });

  // Initialize propose tab (loads registry)
  initProposeTab();

  // Redeem
  document.getElementById('redeem-btn')?.addEventListener('click', redeemStrike);

  // Load proposals
  loadProposals();
});
