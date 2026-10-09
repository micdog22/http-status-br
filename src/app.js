import { CODES, CLASSES, STATUS_LABELS, CONFUSIONS, getCode, classOf, refUrl, refLabel } from './codes.js';
import { searchCodes } from './search.js';

const $ = (id) => document.getElementById(id);
const els = {
  q: $('q'), count: $('count'), groups: $('groups'), empty: $('empty'), doubts: $('doubts'), doubtsNav: $('doubts-nav'), toast: $('toast'),
};
const cards = new Map();
const groups = new Map();
let timer = 0;
let toastTimer = 0;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function codeLink(code) {
  const entry = getCode(code);
  return el('a', { href: `#${code}`, text: `${code} ${entry.phrase}` });
}

// Transforma números de códigos conhecidos em links, sem usar innerHTML.
function withCodeLinks(text) {
  const p = el('p');
  let last = 0;
  for (const match of text.matchAll(/\b[1-5]\d\d\b/g)) {
    if (!getCode(match[0])) continue;
    p.append(text.slice(last, match.index), el('a', { href: `#${match[0]}`, text: match[0] }));
    last = match.index + match[0].length;
  }
  p.append(text.slice(last));
  return p;
}

function joinNodes(nodes, separator) {
  return nodes.flatMap((node, i) => (i ? [separator, node] : [node]));
}

function renderCard(entry) {
  const cls = classOf(entry.code);
  const info = CLASSES[cls];
  const badges = el('div', { class: 'badges' }, el('span', { class: `badge c${cls}`, text: `${info.label} · ${info.name}` }));
  if (entry.status) badges.append(el('span', { class: 'badge status', text: STATUS_LABELS[entry.status] }));
  const head = el('div', { class: 'code-head' },
    el('div', { class: 'num', 'aria-hidden': 'true', text: String(entry.code) }),
    el('div', { class: 'titles' },
      el('h4', { id: `t${entry.code}` }, el('span', { class: 'sr-only', text: `${entry.code} ` }), el('span', { lang: 'en', text: entry.phrase })),
      el('p', { class: 'pt', text: entry.name }),
      badges));
  const parts = [head, el('p', { class: 'summary', text: entry.summary })];
  if (entry.aliases) parts.push(el('p', { class: 'aliases' }, 'Nome antigo: ', el('span', { lang: 'en', text: entry.aliases.join('; ') })));
  parts.push(el('div', { class: 'cols' },
    el('div', {}, el('h5', { text: 'Quando usar' }), el('p', { text: entry.usage })),
    el('div', {}, el('h5', { text: 'Causas comuns' }), el('ul', {}, ...entry.causes.map((c) => el('li', { text: c }))))));

  const info2 = el('div');
  if (entry.related.length) info2.append(el('p', {}, 'Relacionados: ', ...joinNodes(entry.related.map(codeLink), ', ')));
  for (const doubt of CONFUSIONS.filter((c) => c.codes.includes(entry.code))) {
    info2.append(el('p', {}, 'Dúvida comum: ', el('a', { href: `#${doubt.id}`, text: doubt.title })));
  }
  info2.append(el('p', {}, 'Referência: ', ...joinNodes(entry.refs.map((ref) => el('a', { href: refUrl(ref), rel: 'noopener', text: refLabel(ref) })), ' e ')));
  const copy = el('button', { type: 'button', class: 'btn secondary small', 'data-copy': String(entry.code), text: 'Copiar link' });
  copy.setAttribute('aria-label', `Copiar link do código ${entry.code}`);
  parts.push(el('div', { class: 'card-foot' }, info2, copy));
  return el('article', { class: `card code-card c${cls}`, id: String(entry.code), tabindex: '-1', 'aria-labelledby': `t${entry.code}` }, ...parts);
}

function renderGroups() {
  for (const [key, info] of Object.entries(CLASSES)) {
    const cls = Number(key);
    const section = el('section', { class: 'group', 'aria-labelledby': `g${cls}` },
      el('div', { class: 'group-head' }, el('h3', { id: `g${cls}`, text: `${info.label} · ${info.name}` }), el('p', { text: info.description })));
    for (const entry of CODES.filter((e) => classOf(e.code) === cls)) {
      const card = renderCard(entry);
      cards.set(entry.code, card);
      section.append(card);
    }
    groups.set(cls, section);
    els.groups.append(section);
  }
}

function renderDoubts() {
  els.doubtsNav.append(el('span', { text: 'Dúvidas comuns:' }));
  for (const doubt of CONFUSIONS) {
    const card = el('article', { class: 'card doubt', id: doubt.id, tabindex: '-1', 'aria-labelledby': `t-${doubt.id}` },
      el('h3', { id: `t-${doubt.id}`, text: doubt.title }));
    doubt.paragraphs.forEach((text, i) => {
      card.append(withCodeLinks(text));
      if (doubt.table && i === 0) {
        const head = el('tr', {}, ...doubt.table.head.map((h) => el('th', { scope: 'col', text: h })));
        const body = doubt.table.rows.map((row) => el('tr', {},
          el('th', { scope: 'row' }, el('a', { href: `#${row[0]}`, text: row[0] })), ...row.slice(1).map((cell) => el('td', { text: cell }))));
        card.append(el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, head), el('tbody', {}, ...body))));
      }
    });
    card.append(el('p', { class: 'small' }, 'Veja: ', ...joinNodes(doubt.codes.map(codeLink), ', ')));
    els.doubts.append(card);
    els.doubtsNav.append(el('a', { href: `#${doubt.id}`, text: doubt.title }));
  }
}

function applyFilter() {
  const query = els.q.value.trim();
  const cls = Number(document.querySelector('input[name="cls"]:checked').value) || null;
  const visible = new Set(searchCodes(query, { cls }).map((e) => e.code));
  for (const [code, card] of cards) card.hidden = !visible.has(code);
  for (const [key, section] of groups) section.hidden = ![...visible].some((code) => classOf(code) === key);
  els.empty.hidden = visible.size > 0;
  const n = visible.size;
  const noun = n === 1 ? 'código' : 'códigos';
  if (query) els.count.textContent = `${n} ${noun} para “${query}”${cls ? ` na classe ${CLASSES[cls].label}` : ''}.`;
  else if (cls) els.count.textContent = `${n} ${noun} na classe ${CLASSES[cls].label}.`;
  else els.count.textContent = `${n} ${noun}.`;
}

function showHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (!target || !(target.classList.contains('code-card') || target.classList.contains('doubt'))) return;
  if (target.hidden || target.closest('[hidden]')) {
    els.q.value = '';
    document.querySelector('input[name="cls"][value=""]').checked = true;
    applyFilter();
  }
  target.scrollIntoView({ block: 'start' });
  target.focus({ preventScroll: true });
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

async function copyLink(code) {
  const url = `${location.origin}${location.pathname}#${code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast(`Link do ${code} copiado.`);
  } catch {
    toast(`Não foi possível copiar. O link é: ${url}`);
  }
}

function init() {
  renderGroups();
  renderDoubts();
  applyFilter();
  els.q.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilter, 80);
  });
  els.q.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && els.q.value) {
      els.q.value = '';
      applyFilter();
    }
  });
  for (const radio of document.querySelectorAll('input[name="cls"]')) radio.addEventListener('change', applyFilter);
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-copy]');
    if (button) copyLink(button.dataset.copy);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    els.q.focus();
    els.q.select();
  });
  window.addEventListener('hashchange', showHash);
  showHash();
}

init();
