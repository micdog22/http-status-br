import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/http-status.js', import.meta.url));

function run(...args) {
  const r = spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

test('mostra a explicação de um código', () => {
  const r = run('404');
  assert.equal(r.code, 0);
  assert.match(r.out, /^404 Not Found — Não encontrado\n/);
  assert.match(r.out, /4xx · Erro do cliente · RFC 9110, seção 15\.5\.5/);
  assert.match(r.out, /Quando usar/);
  assert.match(r.out, /Causas comuns\n {2}• URL digitada errada/);
  assert.match(r.out, /Relacionados: 410 Gone/);
  assert.match(r.out, /https:\/\/www\.rfc-editor\.org\/rfc\/rfc9110#section-15\.5\.5/);
  assert.doesNotMatch(r.out, /\[\d+m/, 'sem cores com NO_COLOR');
});

test('busca por palavras com e sem acento', () => {
  assert.match(run('não encontrado').out, /^404 Not Found/);
  assert.match(run('nao', 'encontrado').out, /^404 Not Found/);
  const list = run('timeout');
  assert.equal(list.code, 0);
  assert.match(list.out, /2 códigos para “timeout”/);
  assert.match(list.out, /408 {2}Request Timeout/);
  assert.match(list.out, /504 {2}Gateway Timeout/);
});

test('vários códigos de uma vez e listagem por classe', () => {
  const r = run('401', '403');
  assert.match(r.out, /401 Unauthorized — Não autenticado/);
  assert.match(r.out, /403 Forbidden — Proibido/);
  assert.match(r.out, /Dúvida comum: 401 ou 403\?/);
  assert.match(run('1xx').out, /4 códigos para “1xx”/);
  assert.match(run().out, /^62 códigos:/);
});

test('saída em JSON', () => {
  const one = JSON.parse(run('418', '--json').out);
  assert.equal(one.code, 418);
  assert.equal(one.phrase, "I'm a teapot");
  assert.equal(one.status, 'unused');
  assert.deepEqual(one.references.map((r) => r.rfc), [2324, 9110]);
  assert.equal(one.url, 'https://micdog22.github.io/http-status-br/#418');
  const many = JSON.parse(run('--json', 'timeout').out);
  assert.deepEqual(many.map((c) => c.code), [408, 504]);
});

test('códigos de saída para nada encontrado e uso incorreto', () => {
  const none = run('999');
  assert.equal(none.code, 1);
  assert.match(none.err, /Nenhum código encontrado para “999”/);
  assert.equal(run('--json', 'xyzabc').out, '[]\n');
  const bad = run('--cores');
  assert.equal(bad.code, 2);
  assert.match(bad.err, /Opção desconhecida: --cores/);
});

test('ajuda e versão', () => {
  const help = run('--help');
  assert.equal(help.code, 0);
  assert.match(help.out, /^Uso: http-status/);
  assert.equal(run('-v').out, '1.0.0\n');
});
