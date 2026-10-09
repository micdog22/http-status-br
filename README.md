# HTTP Status BR: todos os códigos de status HTTP explicados em português (HTML + JS + Node CLI)

Guia de consulta dos códigos de status HTTP em português claro, para quem cria APIs e para quem está tentando entender um erro. Cada código traz o nome oficial em inglês (conforme o RFC 9110), um nome em português, a explicação, quando usar, as causas mais comuns, os códigos relacionados e a referência ao RFC. Funciona como página web e como comando no terminal.

**Acesse online:** https://micdog22.github.io/http-status-br/

## Recursos

- 62 códigos, de 100 a 511, incluindo os de WebDAV, 103 Early Hints, 425 Too Early, 451 e os códigos raros, com os obsoletos e históricos marcados (305, 510) e a curiosidade do 418.
- Nomes oficiais atuais do RFC 9110 (como 413 Content Too Large e 422 Unprocessable Content), com os nomes antigos também aceitos na busca.
- Busca por número, por prefixo (`50`), por classe (`4xx`) ou por palavras, sem diferenciar acentos (`nao encontrado` acha o 404).
- Filtro por classe: 1xx, 2xx, 3xx, 4xx e 5xx.
- Cada código tem âncora própria (`#404`) e botão para copiar o link.
- Seção de dúvidas comuns: 401 × 403, 400 × 422, 301 × 302 × 303 × 307 × 308 (quem mantém o método) e 502 × 503 × 504.
- Comando `http-status` para o terminal, com saída em texto ou JSON.

## Como usar

Na página, digite um número ou uma palavra (por exemplo `429`, `timeout`, `rate limit` ou `não encontrado`) ou escolha uma classe. Para compartilhar um código, use o link com âncora, como `https://micdog22.github.io/http-status-br/#401`.

### No terminal

Instale direto do GitHub (requer Node.js 18 ou mais recente):

```bash
npm install -g github:micdog22/http-status-br
```

Exemplos:

```bash
http-status 404              # explicação completa
http-status "não encontrado" # busca por palavras
http-status timeout          # lista: 408 e 504
http-status 5xx              # todos os erros do servidor
http-status 401 403          # vários códigos de uma vez
http-status 429 --json       # saída em JSON
```

Saída de `http-status 404`:

```text
404 Not Found: Não encontrado
4xx · Erro do cliente · RFC 9110, seção 15.5.5

O servidor não encontrou nada no endereço pedido, ou não quer revelar que o
recurso existe. O código não diz se a ausência é temporária ou permanente.

Quando usar
  Use quando o recurso não existe ou não deve ser revelado. Se você sabe que ele
  foi removido de propósito e não vai voltar, 410 é mais preciso.

Causas comuns
  • URL digitada errada ou link quebrado.
  ...
```

Códigos de saída: `0` quando encontra, `1` quando não encontra nada e `2` para uso incorreto. As cores são desligadas quando a saída não é um terminal ou quando a variável `NO_COLOR` tem algum valor.

Sem instalar, a partir do código-fonte:

```bash
node bin/http-status.js 404
```

## Como rodar localmente

Os módulos ES não carregam via `file://`, então sirva a pasta:

```bash
python3 -m http.server 8000
```

e abra http://localhost:8000.

## Testes

```bash
npm test
```

(ou `node --test`; não há dependências para instalar)

Os testes conferem a integridade dos dados (códigos únicos, todos os campos preenchidos, classe igual ao primeiro dígito, relacionados existentes, RFC de cada código), a busca e a saída do comando no terminal.

## Fontes

- [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110): semântica do HTTP, onde está a maior parte dos códigos.
- RFC 2518 (102), RFC 8297 (103), RFC 4918 (207, 423, 424, 507), RFC 5842 (208, 508), RFC 3229 (226), RFC 8470 (425), RFC 6585 (428, 429, 431, 511), RFC 7725 (451), RFC 2295 (506), RFC 2774 (510) e RFC 2324 (418).

As explicações são um resumo em português para consulta rápida; em caso de dúvida, vale o texto do RFC indicado em cada código.

## Contribuindo

Issues e pull requests são bem-vindos.

## Licença

MIT. Veja [LICENSE](LICENSE).
