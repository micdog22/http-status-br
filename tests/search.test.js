import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, searchCodes, findExact } from '../src/search.js';

const codes = (query, opts) => searchCodes(query, opts).map((c) => c.code);

test('normaliza acentos, maiúsculas e pontuação', () => {
  assert.equal(normalize('  Não Encontrado! '), 'nao encontrado');
  assert.equal(normalize('Requisição'), 'requisicao');
  assert.equal(normalize('wi-fi'), 'wi fi');
});

test('busca por número e por prefixo', () => {
  assert.deepEqual(codes('404'), [404]);
  assert.deepEqual(codes('40'), [400, 401, 402, 403, 404, 405, 406, 407, 408, 409]);
  assert.deepEqual(codes('999'), []);
});

test('busca por classe', () => {
  assert.equal(codes('4xx').length, 29);
  assert.ok(codes('5XX').every((c) => c >= 500 && c < 600));
  assert.deepEqual(codes('', { cls: 1 }), [100, 101, 102, 103]);
  assert.deepEqual(codes('5xx gateway'), [502, 504]);
});

test('busca por palavras, sem diferenciar acentos', () => {
  assert.equal(codes('não encontrado')[0], 404);
  assert.equal(codes('nao encontrado')[0], 404);
  assert.deepEqual(codes('timeout'), [408, 504]);
  assert.equal(codes('payload too large')[0], 413);
  assert.equal(codes('rate limit')[0], 429);
  assert.equal(codes('wi-fi')[0], 511);
  assert.equal(codes('bule')[0], 418);
  assert.equal(codes('token')[0], 401);
  assert.deepEqual(codes('xyzabc'), []);
});

test('o filtro de classe se combina com a busca', () => {
  assert.deepEqual(codes('redirecionamento', { cls: 3 }), codes('redirecionamento').filter((c) => c >= 300 && c < 400));
  assert.deepEqual(codes('404', { cls: 5 }), []);
});

test('encontra o código exato pelo número ou pelo nome', () => {
  assert.equal(findExact('Not Found').code, 404);
  assert.equal(findExact('não encontrado').code, 404);
  assert.equal(findExact('unprocessable entity').code, 422);
  assert.equal(findExact('418').code, 418);
  assert.equal(findExact("i'm a teapot").code, 418);
  assert.equal(findExact('abc'), null);
  assert.equal(findExact(''), null);
});
