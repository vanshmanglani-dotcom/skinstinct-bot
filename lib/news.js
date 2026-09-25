// Google News RSS: free, no key, no account.
function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]).trim() : '';
};
const stripHtml = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function search(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkinstinctBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Google News returned ${res.status}`);
  const xml = await res.text();
  const item = xml.match(/<item>([\s\S]*?)<\/item>/i)?.[1];
  if (!item) return null;

  const source = tag(item, 'source');
  let headline = tag(item, 'title');
  if (source && headline.endsWith(` - ${source}`)) headline = headline.slice(0, -(source.length + 3));
  const pub = tag(item, 'pubDate');
  const date = pub ? new Date(pub).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  let summary = stripHtml(tag(item, 'description'));
  if (!summary || summary.startsWith(headline)) summary = headline;
  return { headline, source, date, link: tag(item, 'link'), summary: summary.slice(0, 300) };
}

// Prefer something from the last 30 days; fall back to any date.
export async function fetchTopNews(query) {
  return (await search(`${query} when:30d`)) || (await search(query));
}
