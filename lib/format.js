// Message text helpers.
export const HELP = `Skinstinct content engine is running.

Post a note here (text or voice note). I'll score it, and if it's strong enough I'll send back a LinkedIn draft in your voice.

Reply APPROVE or REJECT under a draft to record your decision. Nothing is ever posted anywhere automatically.`;

export function parseDecision(text) {
  const m = String(text || '').trim().match(/^(approve|approved|reject|rejected)\b/i);
  if (!m) return null;
  return m[1].toLowerCase().startsWith('approve') ? 'approved' : 'rejected';
}

export function verifyFlag(news) {
  const line = '─────────────────────────────────';
  return [
    line,
    `NEWS SOURCE: ${news.headline}`,
    `FROM: ${news.source || 'Unknown'} · ${news.date || 'date unknown'}`,
    `LINK: ${news.link}`,
    '⚠ Check this before publishing — you are the author of this claim',
    line,
  ].join('\n');
}

