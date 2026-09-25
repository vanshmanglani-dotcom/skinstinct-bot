// The AI steps: transcribe, score, find news, draft.
import { downloadFile } from './telegram.js';
import { geminiGenerate, geminiDraftModel } from './gemini.js';
import { claudeGenerate, claudeModel } from './claude.js';
import { fetchTopNews } from './news.js';
import { parseJson } from './json.js';
import { SCORING_SYSTEM, KEYWORDS_SYSTEM, TRANSCRIBE_PROMPT, draftSystem, draftUser } from './prompts.js';

export async function transcribe(media) {
  const audio = await downloadFile(media.file_id);
  return geminiGenerate({
    parts: [
      { inline_data: { mime_type: media.mime_type || 'audio/ogg', data: audio.toString('base64') } },
      { text: TRANSCRIBE_PROMPT },
    ],
    temperature: 0,
  });
}

export async function scoreNote(note) {
  const out = parseJson(await geminiGenerate({ system: SCORING_SYSTEM, parts: [{ text: note }], json: true, temperature: 0 }));
  const score = Math.max(0, Math.min(10, Math.round(Number(out.score) || 0)));
  return { score, reason: String(out.reason || 'No reason given').trim() };
}

export async function findNews(note) {
  try {
    const kw = parseJson(await geminiGenerate({ system: KEYWORDS_SYSTEM, parts: [{ text: note }], json: true, temperature: 0 }));
    const query = String(kw.query || (kw.keywords || []).slice(0, 3).join(' ')).trim();
    if (!query) return { query: null, news: null };
    return { query, news: await fetchTopNews(query) };
  } catch (e) {
    console.warn('News lookup failed, drafting without it:', e.message);
    return { query: null, news: null };
  }
}

export async function writeDraft(note, news, voice) {
  const system = draftSystem(voice);
  const user = draftUser(note, news);
  const useClaude = (process.env.DRAFT_MODEL || 'gemini').trim().toLowerCase() === 'claude';
  const raw = useClaude
    ? await claudeGenerate({ system, user })
    : await geminiGenerate({ model: geminiDraftModel(), system, parts: [{ text: user }], json: true, temperature: 0.7 });
  const out = parseJson(raw);
  const post = String(out.post || '').trim();
  if (!post) throw new Error('The drafting model returned an empty post');
  return { post, usedNews: Boolean(out.used_news) && Boolean(news), model: useClaude ? claudeModel() : geminiDraftModel() };
}

