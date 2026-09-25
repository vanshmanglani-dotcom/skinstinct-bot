import fs from 'node:fs';
import path from 'node:path';

// Shows which settings are present (never their values).
export default function handler(req, res) {
  const has = (k) => Boolean((process.env[k] || '').trim());
  let voiceFile = false;
  try { voiceFile = fs.existsSync(path.join(process.cwd(), 'voice-skill.txt')); } catch {}
  const draftModel = (process.env.DRAFT_MODEL || 'gemini').trim().toLowerCase();
  const checks = {
    TELEGRAM_BOT_TOKEN: has('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_WEBHOOK_SECRET: has('TELEGRAM_WEBHOOK_SECRET'),
    TELEGRAM_CHAT_ID: has('TELEGRAM_CHAT_ID'),
    GEMINI_API_KEY: has('GEMINI_API_KEY'),
    SUPABASE_URL: has('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
    ANTHROPIC_API_KEY: has('ANTHROPIC_API_KEY'),
  };
  const problems = [];
  if (!checks.TELEGRAM_BOT_TOKEN) problems.push('TELEGRAM_BOT_TOKEN missing');
  if (!checks.GEMINI_API_KEY) problems.push('GEMINI_API_KEY missing');
  if (draftModel === 'claude' && !checks.ANTHROPIC_API_KEY) problems.push('DRAFT_MODEL=claude but ANTHROPIC_API_KEY missing');
  if (!checks.SUPABASE_URL || !checks.SUPABASE_SERVICE_ROLE_KEY) problems.push('Supabase not connected: notes/drafts will not be saved');
  res.status(200).json({
    ok: problems.length === 0,
    draft_model: draftModel,
    gemini_model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    voice_skill_file: voiceFile,
    settings_present: checks,
    problems,
  });
}
