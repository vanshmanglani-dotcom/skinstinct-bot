// Handles a new note: save, score, find news, draft, send back.
import { sendMessage } from './telegram.js';
import { loadVoiceSkill } from './voice.js';
import { dbEnabled, insertNote, updateNote, insertDraft } from './db.js';
import { transcribe, scoreNote, findNews, writeDraft } from './steps.js';
import { verifyFlag } from './format.js';

const threshold = () => Number(process.env.SCORE_THRESHOLD || 6);

async function saveNote(id, patch) {
  if (!id || !dbEnabled()) return;
  try { await updateNote(id, patch); } catch (e) { console.error('Could not update note:', e.message); }
}

export async function handleNote(updateId, msg, text) {
  const chatId = msg.chat.id;
  const media = msg.voice || msg.audio;
  let noteId = null;
  try {
    if (dbEnabled()) {
      const row = await insertNote({
        telegram_update_id: updateId,
        telegram_message_id: msg.message_id,
        chat_id: chatId,
        kind: text ? 'text' : 'voice',
        raw_text: text || null,
        status: 'received',
      });
      if (!row) { console.log(`Update ${updateId} already processed, skipping`); return; }
      noteId = row.id;
    }

    let note = text;
    if (!note && media) {
      note = await transcribe(media);
      await saveNote(noteId, { raw_text: note });
    }

    const { score, reason } = await scoreNote(note);
    await saveNote(noteId, { score, score_reason: reason });

    if (score < threshold()) {
      await sendMessage(chatId, `🚫 Not drafted (score ${score}/10)\n${reason}`, msg.message_id);
      await saveNote(noteId, { status: 'rejected' });
      return;
    }

    const { query, news } = await findNews(note);
    const voice = await loadVoiceSkill();
    const { post, usedNews, model } = await writeDraft(note, news, voice);

    let out = `✍️ DRAFT (score ${score}/10: ${reason})\n\n${post}`;
    if (usedNews) out += `\n\n${verifyFlag(news)}`;
    out += '\n\nReply APPROVE or REJECT to this message.';

    const sent = await sendMessage(chatId, out, msg.message_id);

    if (dbEnabled()) {
      await insertDraft({
        note_id: noteId,
        chat_id: chatId,
        telegram_message_id: sent.message_id,
        draft_text: post,
        model,
        news_query: query,
        used_news: usedNews,
        news_headline: usedNews ? news.headline : null,
        news_source: usedNews ? news.source : null,
        news_date: usedNews ? news.date : null,
        news_link: usedNews ? news.link : null,
        status: 'pending',
      });
    }
    await saveNote(noteId, { status: 'drafted' });
  } catch (err) {
    console.error('Pipeline error:', err);
    await saveNote(noteId, { status: 'error', error: String(err.message).slice(0, 2000) });
    await sendMessage(chatId, `⚠️ Something went wrong with this note:\n${String(err.message).slice(0, 3000)}`, msg.message_id).catch(() => {});
  }
}
