// /api/news — busca notícias recentes do Brasil, separadas por tema,
// via Google News RSS, e devolve um JSON pronto para a landing page consumir.
// A resposta fica em cache por 24h na CDN da Vercel (stale-while-revalidate),
// então o conteúdo se renova sozinho todos os dias sem precisar de infraestrutura extra.

const CATEGORIES = {
  poder: 'política Brasil eleições governo',
  dinheiro: 'economia Brasil Selic inflação PIB',
  tela: 'inteligência artificial Brasil tecnologia startups',
  cultura: 'cultura cinema música Brasil',
  campo: 'seleção brasileira futebol'
};

const ITEMS_PER_CATEGORY = 4;

function decodeEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(block, tag) {
  const re = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
  const match = block.match(re);
  if (!match) return '';
  let value = match[1];
  const cdata = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) value = cdata[1];
  return decodeEntities(value.replace(/<[^>]*>/g, '').trim());
}

function parseGoogleNewsRSS(xml, limit) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) && items.length < limit) {
    const block = match[1];
    let title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractTag(block, 'source');

    if (source && title.endsWith(' - ' + source)) {
      title = title.slice(0, title.length - (' - ' + source).length).trim();
    }

    if (title && link) {
      items.push({ title: title, link: link, source: source, pubDate: pubDate });
    }
  }
  return items;
}

async function fetchCategory(query) {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query) +
    '&hl=pt-BR&gl=BR&ceid=BR:pt-419';

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GiroNewsletterBot/1.0; +https://vercel.com)'
    }
  });

  if (!response.ok) {
    throw new Error('Falha ao buscar feed: status ' + response.status);
  }

  const xml = await response.text();
  return parseGoogleNewsRSS(xml, ITEMS_PER_CATEGORY);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=21600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const entries = Object.entries(CATEGORIES);
  const results = {};

  await Promise.all(
    entries.map(async ([key, query]) => {
      try {
        results[key] = await fetchCategory(query);
      } catch (err) {
        results[key] = [];
      }
    })
  );

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    categories: results
  });
};
