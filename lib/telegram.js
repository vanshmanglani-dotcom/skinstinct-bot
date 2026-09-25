// Minimal Telegram Bot API helpers.
const token = () => {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return t.trim();
};

export async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result;
}

// Telegram caps messages at 4096 chars. Split on paragraph breaks if needed.
function splitText(text, max = 4000) {
  if (text.length <= max) return [text];
  const chunks = [];
  let current = '';
  for (const para of text.split('\n\n')) {
    const piece = current ? `${current}\n\n${para}` : para;
    if (piece.length <= max) { current = piece; continue; }
    if (current) chunks.push(current);
    let rest = para;
    while (rest.length > max) { chunks.push(rest.slice(0, max)); rest = rest.slice(max); }
    current = rest;
  }
  if (current) chunks.push(current);
  return chunks;
}

// Sends plain text (no Markdown, so nothing in a draft can break formatting).
// Returns the LAST message sent, because that's the one ending in "Reply APPROVE or REJECT".
export async function sendMessage(chatId, text, replyToMessageId) {
  let last;
  const chunks = splitText(text);
  for (let i = 0; i < chunks.length; i++) {
    const payload = { chat_id: chatId, text: chunks[i], link_preview_options: { is_disabled: true } };
    if (replyToMessageId && i === 0) {
      payload.reply_parameters = { message_id: replyToMessageId, allow_sending_without_reply: true };
    }
    last = await tg('sendMessage', payload);
  }
  return last;
}

export async function downloadFile(fileId) {
  const file = await tg('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${token()}/${file.file_path}`);
  if (!res.ok) throw new Error(`Could not download voice note (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
