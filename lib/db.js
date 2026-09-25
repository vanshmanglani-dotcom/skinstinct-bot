// Supabase via its REST API (no extra dependency). Uses the service_role key: server-side only.
export const dbEnabled = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const base = process.env.SUPABASE_URL.trim().replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // Legacy service_role keys are JWTs (eyJ...) and also go in Authorization; new sb_secret_ keys go in apikey only.
  if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${base}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Supabase ${method} ${path.split('?')[0]} failed (${res.status}): ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

// Returns null if this Telegram update was already saved (Telegram retry) so we don't process it twice.
export async function insertNote(row) {
  try {
    const rows = await rest('notes', { method: 'POST', body: row, prefer: 'return=representation' });
    return rows[0];
  } catch (e) {
    if (e.status === 409) return null;
    throw e;
  }
}
export const updateNote = (id, patch) => rest(`notes?id=eq.${id}`, { method: 'PATCH', body: patch });

export async function insertDraft(row) {
  const rows = await rest('drafts', { method: 'POST', body: row, prefer: 'return=representation' });
  return rows[0];
}
export async function findDraftByMessage(chatId, messageId) {
  const rows = await rest(`drafts?chat_id=eq.${chatId}&telegram_message_id=eq.${messageId}&select=*&limit=1`);
  return rows[0] || null;
}
export async function updateDraft(id, patch) {
  const rows = await rest(`drafts?id=eq.${id}`, { method: 'PATCH', body: patch, prefer: 'return=representation' });
  return rows[0];
}
export async function getActiveVoiceSkill() {
  const rows = await rest('voice_skill?is_active=eq.true&order=created_at.desc&limit=1&select=content');
  return rows[0]?.content || null;
}
