import { sendMessage } from './telegram.js';
import { dbEnabled, findDraftByMessage, updateDraft } from './db.js';
import { HELP, parseDecision } from './format.js';
import { handleNote } from './note.js';

export async function processUpdate(update) {
  // Channel posts arrive as channel_post, NOT message. Handle both.
  const msg = update?.channel_post || update?.message;
  if (!msg) {
    console.log('Ignoring update with no message/channel_post:', Object.keys(update || {}).join(','));
    return;
  }
  const chatId = msg.chat?.id;
  const allowed = (process.env.TELEGRAM_CHAT_ID || '').trim();
  if (allowed && String(chatId) !== allowed) {
    console.log(`Ignoring message from chat ${chatId} (TELEGRAM_CHAT_ID is ${allowed})`);
    return;
  }
  if (msg.from?.is_bot) return;

  const text = (msg.text || msg.caption || '').trim();
  if (/^\/(start|help)\b/i.test(text)) {
    await sendMessage(chatId, HELP, msg.message_id);
    return;
  }
  if (msg.reply_to_message && (await handleReply(msg, text))) return;
  if (!text && !msg.voice && !msg.audio) return;

  await handleNote(update.update_id, msg, text);
}

async function handleReply(msg, text) {
  const chatId = msg.chat.id;
  const decision = parseDecision(text);
  if (!dbEnabled()) {
    if (!decision) return false;
    await sendMessage(chatId, "Can't record that yet: the database isn't connected (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).", msg.message_id);
    return true;
  }
  const draft = await findDraftByMessage(chatId, msg.reply_to_message.message_id);
  if (!draft) {
    if (!decision) return false; // an ordinary reply to something else: treat as a new note
    await sendMessage(chatId, "I couldn't find a draft for that message. Reply APPROVE or REJECT directly under a draft.", msg.message_id);
    return true;
  }
  if (!decision) {
    await sendMessage(chatId, 'To record a decision on this draft, reply with just APPROVE or REJECT.', msg.message_id);
    return true;
  }
  await updateDraft(draft.id, { status: decision, decided_at: new Date().toISOString() });
  await sendMessage(
    chatId,
    decision === 'approved'
      ? "✅ Approved and saved. Nothing has been posted anywhere. Copy it to LinkedIn yourself when you're ready."
      : '❌ Rejected and saved. The draft is kept so you can see what needs improving.',
    msg.message_id,
  );
  return true;
}

