# Giro — newsletter de notícias do Brasil

Landing page minimalista + API serverless que busca notícias do Brasil
automaticamente, separadas por tema (Poder, Dinheiro, Tela & Código,
Cultura, Campo).

## Estrutura

```
index.html      → landing page (estático)
api/news.js     → função serverless (Vercel) que busca e retorna as notícias em JSON
package.json    → metadados do projeto
```

## Como funciona

`api/news.js` busca notícias recentes via Google News RSS para cada tema e
devolve um JSON. A resposta fica em cache por 24h na CDN da Vercel
(`Cache-Control: s-maxage=86400, stale-while-revalidate`), então o conteúdo
se renova sozinho todos os dias sem precisar de cron job ou banco de dados.

O `index.html` faz `fetch('/api/news')` ao carregar e substitui as manchetes
estáticas (usadas como fallback caso a API falhe) pelas notícias do dia.

## Deploy

Basta conectar este repositório a um projeto na Vercel — não é necessário
nenhum build step ou variável de ambiente. A Vercel detecta `index.html`
como estático e `api/news.js` como função serverless automaticamente.
