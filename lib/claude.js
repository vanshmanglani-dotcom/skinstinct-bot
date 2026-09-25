export const claudeModel = () => (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5').trim();

export async function claudeGenerate({ system, user, maxTokens = 2000 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('DRAFT_MODEL is "claude" but ANTHROPIC_API_KEY is not set');
  const model = claudeModel();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude (${model}) error ${res.status}: ${data?.error?.message || 'unknown error'}`);
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error(`Claude (${model}) returned no text`);
  return text;
}
