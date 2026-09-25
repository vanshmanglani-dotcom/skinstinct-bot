const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// "-latest" alias so Google retiring a pinned version doesn't break the bot.
export const fastModel = () => (process.env.GEMINI_MODEL || 'gemini-flash-latest').trim();
export const geminiDraftModel = () => (process.env.GEMINI_DRAFT_MODEL || fastModel()).trim();

export async function geminiGenerate({ model = fastModel(), system, parts, json = false, temperature }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const body = { contents: [{ role: 'user', parts }], generationConfig: {} };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (json) body.generationConfig.responseMimeType = 'application/json';
  if (temperature !== undefined) body.generationConfig.temperature = temperature;

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    // Key goes in a header, not the URL, so it never shows up in logs.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Gemini (${model}) error ${res.status}: ${data?.error?.message || 'unknown error'}`);
  }
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
  if (!text) throw new Error(`Gemini (${model}) returned no text (finishReason: ${cand?.finishReason || 'none'})`);
  return text;
}
