import test from 'node:test';
import assert from 'node:assert/strict';
import { CODES, CLASSES, CONFUSIONS, STATUS_LABELS, getCode, classOf, refUrl, refLabel } from '../src/codes.js';

const EXPECTED = [
  100, 101, 102, 103, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 307, 308,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423,
  424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
];

test('tem exatamente os códigos esperados, sem repetição e em ordem', () => {
  const codes = CODES.map((c) => c.code);
  assert.deepEqual(codes, EXPECTED);
  assert.equal(new Set(codes).size, codes.length);
});

test('todos os campos estão preenchidos', () => {
  for (const entry of CODES) {
    for (const field of ['phrase', 'name', 'summary', 'usage']) {
      assert.equal(typeof entry[field], 'string', `${entry.code}.${field}`);
      assert.ok(entry[field].trim().length > 1, `${entry.code}.${field} vazio`);
    }
    assert.ok(Array.isArray(entry.causes) && entry.causes.length > 0, `${entry.code}.causes`);
    for (const cause of entry.causes) assert.ok(typeof cause === 'string' && cause.length > 5, `${entry.code}: causa vazia`);
    assert.ok(Array.isArray(entry.related), `${entry.code}.related`);
    assert.ok(entry.refs.length > 0, `${entry.code}.refs`);
    for (const ref of entry.refs) {
      assert.ok(Number.isInteger(ref.rfc), `${entry.code}: RFC inválido`);
      if (ref.section) assert.match(ref.section, /^\d+(\.\d+)*$/, `${entry.code}: seção inválida`);
    }
    assert.ok(Array.isArray(entry.keywords), `${entry.code}.keywords`);
    if (entry.status) assert.ok(entry.status in STATUS_LABELS, `${entry.code}.status`);
  }
});

test('a classe é o primeiro dígito do código', () => {
  for (const entry of CODES) {
    assert.equal(classOf(entry.code), Number(String(entry.code)[0]));
    assert.ok(CLASSES[classOf(entry.code)], `classe de ${entry.code}`);
    assert.equal(CLASSES[classOf(entry.code)].label, `${String(entry.code)[0]}xx`);
  }
});

test('códigos relacionados existem e não apontam para si mesmos', () => {
  for (const entry of CODES) {
    for (const rel of entry.related) {
      assert.ok(getCode(rel), `${entry.code} aponta para ${rel}, que não existe`);
      assert.notEqual(rel, entry.code);
    }
    assert.equal(new Set(entry.related).size, entry.related.length, `${entry.code}: relacionados repetidos`);
  }
});

test('nomes oficiais atuais do RFC 9110', () => {
  const phrase = (code) => getCode(code).phrase;
  assert.equal(phrase(413), 'Content Too Large');
  assert.equal(phrase(414), 'URI Too Long');
  assert.equal(phrase(416), 'Range Not Satisfiable');
  assert.equal(phrase(422), 'Unprocessable Content');
  assert.equal(phrase(302), 'Found');
  assert.equal(phrase(401), 'Unauthorized');
  assert.deepEqual(getCode(413).aliases, ['Payload Too Large', 'Request Entity Too Large']);
  assert.deepEqual(getCode(422).aliases, ['Unprocessable Entity']);
});

test('referência de RFC de cada código', () => {
  const rfcs = (code) => getCode(code).refs.map((r) => r.rfc);
  const special = {
    102: [2518], 103: [8297], 207: [4918], 423: [4918], 424: [4918], 507: [4918], 208: [5842], 508: [5842],
    226: [3229], 425: [8470], 428: [6585], 429: [6585], 431: [6585], 511: [6585], 451: [7725], 506: [2295],
    510: [2774], 418: [2324, 9110],
  };
  for (const entry of CODES) {
    assert.deepEqual(rfcs(entry.code), special[entry.code] ?? [9110], `RFC de ${entry.code}`);
  }
  for (const code of [308, 421, 422, 426]) assert.deepEqual(rfcs(code), [9110]);
});

test('seções do RFC 9110 dos códigos principais', () => {
  const section = (code) => getCode(code).refs.find((r) => r.rfc === 9110).section;
  assert.equal(section(100), '15.2.1');
  assert.equal(section(200), '15.3.1');
  assert.equal(section(308), '15.4.9');
  assert.equal(section(404), '15.5.5');
  assert.equal(section(418), '15.5.19');
  assert.equal(section(422), '15.5.21');
  assert.equal(section(426), '15.5.22');
  assert.equal(section(505), '15.6.6');
});

test('códigos obsoletos, históricos e sem uso estão marcados', () => {
  assert.equal(getCode(305).status, 'deprecated');
  assert.equal(getCode(418).status, 'unused');
  assert.equal(getCode(510).status, 'historic');
  assert.equal(CODES.filter((c) => c.status).length, 3);
});

test('dúvidas comuns cobrem as confusões clássicas', () => {
  const sets = CONFUSIONS.map((c) => c.codes.join(','));
  for (const pair of ['401,403', '400,422', '301,302,303,307,308', '502,503,504']) assert.ok(sets.includes(pair), pair);
  for (const doubt of CONFUSIONS) {
    for (const code of doubt.codes) assert.ok(getCode(code), `${doubt.id}: ${code}`);
    assert.match(doubt.id, /^duvida-[a-z0-9-]+$/);
    assert.ok(doubt.paragraphs.length > 0);
  }
  const redirects = CONFUSIONS.find((c) => c.id === 'duvida-redirecionamentos');
  assert.deepEqual(redirects.table.rows.map((r) => r[0]), ['301', '302', '303', '307', '308']);
  assert.match(redirects.table.rows[3][2], /Mantém o método/);
  assert.match(redirects.table.rows[4][2], /Mantém o método/);
});

test('links e rótulos das referências', () => {
  assert.equal(refUrl({ rfc: 9110, section: '15.5.5' }), 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.5');
  assert.equal(refUrl({ rfc: 2324 }), 'https://www.rfc-editor.org/rfc/rfc2324');
  assert.equal(refLabel({ rfc: 6585, section: '4' }), 'RFC 6585, seção 4');
  assert.equal(getCode('404').code, 404);
  assert.equal(getCode(999), null);
});
