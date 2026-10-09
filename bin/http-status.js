#!/usr/bin/env node
// Consulta os códigos de status HTTP pelo terminal.
import { readFileSync } from 'node:fs';
import { CODES, CLASSES, STATUS_LABELS, CONFUSIONS, getCode, classOf, refUrl, refLabel } from '../src/codes.js';
import { searchCodes, findExact } from '../src/search.js';

const SITE = 'https://micdog22.github.io/http-status-br/';
const HELP = `Uso: http-status [opções] <código | palavras>

Explica códigos de status HTTP em português.

Exemplos:
  http-status 404
  http-status "não encontrado"
  http-status timeout
  http-status 5xx
  http-status 401 403
  http-status 429 --json

Opções:
  --json          mostra o resultado em JSON
  -h, --help      mostra esta ajuda
  -v, --version   mostra a versão

Sem argumentos, lista todos os códigos.
Saída: 0 quando encontra, 1 quando não encontra nada, 2 em caso de uso incorreto.`;

const ESC = String.fromCharCode(27);
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (sgr, text) => (useColor ? `${ESC}[${sgr}m${text}${ESC}[0m` : text);
const CLASS_COLORS = { 1: '36', 2: '32', 3: '35', 4: '33', 5: '31' };

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { json: false, help: false, version: false, terms: [] };
  for (const arg of argv) {
    if (arg === '--json') opts.json = true;
    else if (arg === '-h' || arg === '--help') opts.help = true;
    else if (arg === '-v' || arg === '--version') opts.version = true;
    else if (arg.startsWith('-') && arg.length > 1) throw new UsageError(`Opção desconhecida: ${arg}`);
    else opts.terms.push(arg);
  }
  return opts;
}

function wrap(text, width, indent = '', firstIndent = indent) {
  const lines = [];
  let line = firstIndent;
  let empty = true;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!empty && line.length + 1 + word.length > width) {
      lines.push(line);
      line = indent + word;
    } else {
      line = empty ? line + word : `${line} ${word}`;
    }
    empty = false;
  }
  if (!empty) lines.push(line);
  return lines.join('\n');
}

const title = (entry) => `${entry.code} ${entry.phrase} — ${entry.name}`;

function formatEntry(entry, width) {
  const cls = CLASSES[classOf(entry.code)];
  const out = [paint(`1;${CLASS_COLORS[classOf(entry.code)]}`, title(entry))];
  const meta = [`${cls.label} · ${cls.name}`, ...entry.refs.map(refLabel)];
  if (entry.status) meta.push(STATUS_LABELS[entry.status]);
  out.push(paint('2', meta.join(' · ')));
  if (entry.aliases) out.push(paint('2', `Nome antigo: ${entry.aliases.join('; ')}`));
  out.push('', wrap(entry.summary, width));
  out.push('', paint('1', 'Quando usar'), wrap(entry.usage, width, '  '));
  out.push('', paint('1', 'Causas comuns'));
  for (const cause of entry.causes) out.push(wrap(cause, width, '    ', '  • '));
  const related = entry.related.map(getCode).filter(Boolean).map((r) => `${r.code} ${r.phrase}`);
  out.push('', wrap(`Relacionados: ${related.join(' · ')}`, width, '  ', ''));
  for (const doubt of CONFUSIONS.filter((c) => c.codes.includes(entry.code))) {
    out.push(wrap(`Dúvida comum: ${doubt.title} ${SITE}#${doubt.id}`, width, '  ', ''));
  }
  out.push(`Referência: ${entry.refs.map(refUrl).join(' e ')}`);
  return out.join('\n');
}

const formatLine = (entry) => `${paint(`1;${CLASS_COLORS[classOf(entry.code)]}`, String(entry.code))}  ${entry.phrase} — ${entry.name}`;

function toJson(entry) {
  const cls = CLASSES[classOf(entry.code)];
  return {
    code: entry.code,
    phrase: entry.phrase,
    name: entry.name,
    class: cls.label,
    className: cls.name,
    ...(entry.status ? { status: entry.status } : {}),
    ...(entry.aliases ? { aliases: entry.aliases } : {}),
    summary: entry.summary,
    usage: entry.usage,
    causes: entry.causes,
    related: entry.related,
    references: entry.refs.map((ref) => ({ ...ref, url: refUrl(ref) })),
    url: `${SITE}#${entry.code}`,
  };
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    process.stderr.write(`${err.message}\nUse --help para ver as opções.\n`);
    return 2;
  }
  if (opts.help) {
    process.stdout.write(`${HELP}\n`);
    return 0;
  }
  if (opts.version) {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  const query = opts.terms.join(' ').trim();
  let results;
  let single = false;
  if (!query) {
    results = CODES;
  } else if (opts.terms.length > 1 && opts.terms.every((t) => /^\d{3}$/.test(t))) {
    const missing = opts.terms.filter((t) => !getCode(t));
    if (missing.length) process.stderr.write(`Código não encontrado: ${missing.join(', ')}.\n`);
    results = opts.terms.map(getCode).filter(Boolean);
    single = true;
  } else {
    const exact = findExact(query);
    results = exact ? [exact] : searchCodes(query);
    single = Boolean(exact) || results.length === 1;
  }

  if (!results.length) {
    if (opts.json) process.stdout.write('[]\n');
    process.stderr.write(`Nenhum código encontrado para “${query}”.\n`);
    return 1;
  }
  if (opts.json) {
    const data = single && results.length === 1 ? toJson(results[0]) : results.map(toJson);
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return 0;
  }
  const width = Math.max(40, Math.min(process.stdout.columns || 80, 100));
  if (single) {
    process.stdout.write(`${results.map((entry) => formatEntry(entry, width)).join('\n\n')}\n`);
  } else {
    const header = query ? `${results.length} códigos para “${query}”:` : `${results.length} códigos:`;
    process.stdout.write(`${header}\n${results.map(formatLine).join('\n')}\n`);
    if (query) process.stdout.write(paint('2', 'Use o número para ver os detalhes, por exemplo: http-status 404\n'));
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
