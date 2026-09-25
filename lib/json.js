// Models sometimes wrap JSON in ```fences``` or add a sentence. Pull out the object.
export function parseJson(text) {
  const cleaned = String(text).replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error(`Model did not return valid JSON: ${cleaned.slice(0, 200)}`);
}
