import fs from 'node:fs';
import path from 'node:path';
import { dbEnabled, getActiveVoiceSkill } from './db.js';

let fileCache;

// The voice_skill table wins (so it can be edited without redeploying);
// voice-skill.txt in the repo is the fallback.
export async function loadVoiceSkill() {
  if (dbEnabled()) {
    try {
      const fromDb = await getActiveVoiceSkill();
      if (fromDb) return fromDb;
    } catch (e) {
      console.warn('Could not read voice_skill table, using voice-skill.txt:', e.message);
    }
  }
  if (!fileCache) fileCache = fs.readFileSync(path.join(process.cwd(), 'voice-skill.txt'), 'utf8').trim();
  return fileCache;
}
