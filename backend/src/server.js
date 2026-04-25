const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const sharp = require('sharp');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me-in-production';
const USE_MOCK_AI = String(process.env.USE_MOCK_AI || 'false').toLowerCase() === 'true';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const IMAGE_PROVIDER = process.env.IMAGE_PROVIDER || 'auto';

if (!ffmpegPath) {
  throw new Error('Bundled ffmpeg binary is missing.');
}

const dbPath = path.join(__dirname, '..', 'data', 'app.db');
const storageRoot = path.join(__dirname, '..', 'storage');
const audioDir = path.join(storageRoot, 'audio');
const imageDir = path.join(storageRoot, 'images');
const renderDir = path.join(storageRoot, 'renders');
const subtitleDir = path.join(storageRoot, 'subtitles');
const videoDir = path.join(storageRoot, 'videos');

[audioDir, imageDir, renderDir, subtitleDir, videoDir].forEach((directory) => {
  fs.mkdirSync(directory, { recursive: true });
});

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    tier: 'free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    credits: 50,
    features: ['50 credits per month', 'Basic templates', 'Standard rendering'],
  },
  {
    id: 'starter',
    name: 'Starter',
    tier: 'starter',
    price: 19,
    currency: 'USD',
    interval: 'month',
    credits: 200,
    features: ['200 credits per month', 'All templates', '1080p exports'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    tier: 'pro',
    price: 49,
    currency: 'USD',
    interval: 'month',
    credits: 600,
    features: ['600 credits per month', 'Priority rendering', 'Premium voice access'],
  },
];

const fallbackVoices = [
  {
    id: 'sarah',
    name: 'Sarah',
    category: 'professional',
    description: 'Warm and clear female narrator voice',
    gender: 'female',
    age: 'young',
    accent: 'American',
  },
  {
    id: 'james',
    name: 'James',
    category: 'professional',
    description: 'Deep and authoritative male narrator voice',
    gender: 'male',
    age: 'middle-aged',
    accent: 'British',
  },
  {
    id: 'emma',
    name: 'Emma',
    category: 'casual',
    description: 'Friendly creator voice',
    gender: 'female',
    age: 'young',
    accent: 'American',
  },
  {
    id: 'michael',
    name: 'Michael',
    category: 'casual',
    description: 'Confident marketing narrator voice',
    gender: 'male',
    age: 'young',
    accent: 'American',
  },
];

const gradientPalette = [
  ['#312e81', '#9333ea'],
  ['#0f766e', '#06b6d4'],
  ['#7c2d12', '#f97316'],
  ['#1d4ed8', '#2563eb'],
  ['#111827', '#4f46e5'],
  ['#4c1d95', '#db2777'],
];

const templateVisualStyles = {
  reel: 'high-energy social media reel, bold composition, dramatic lighting, polished commercial look',
  short: 'educational short video frame, clean composition, modern digital storytelling, crisp details',
  ad: 'premium product ad frame, cinematic lighting, aspirational branding, conversion-focused visual hierarchy',
  story: 'emotional story scene, cinematic framing, expressive character moment, rich atmosphere',
  general: 'cinematic vertical video frame, polished lighting, premium digital content look',
};

const moodVisualStyles = {
  bold: 'confident, punchy, high contrast, dynamic',
  energetic: 'fast-paced, vibrant, exciting, motion-driven',
  professional: 'clean, trustworthy, polished, premium',
  playful: 'colorful, expressive, lively, fun',
  calm: 'soft, balanced, elegant, minimal',
  dramatic: 'cinematic, moody, high-impact, emotional',
  default: 'polished, engaging, social-ready',
};

const jobQueue = [];
let isProcessingQueue = false;

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function estimateWordTarget(duration) {
  return clamp(Math.round(duration * 2.3), 20, 180);
}

function normalizeScript(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?;:])/g, '$1')
    .trim();
}

function normalizeSentence(text, fallback = '') {
  const normalized = normalizeScript(text || fallback);
  if (!normalized) {
    return '';
  }

  const withPunctuation = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return withPunctuation.charAt(0).toUpperCase() + withPunctuation.slice(1);
}

function buildScriptSuggestions(template, mood) {
  return [
    `Open with a stronger ${mood} hook in the first sentence`,
    `Keep the ${template} message focused on one clear benefit`,
    'End with a direct, one-line call to action',
  ];
}

function buildFallbackScript({ prompt, mood, duration, template }) {
  const topic = normalizeScript(prompt);
  const templateLabel = template === 'ad'
    ? 'product ad'
    : template === 'story'
    ? 'story-led video'
    : template === 'short'
    ? 'short explainer'
    : 'social reel';

  return normalizeScript(
    `Stop scrolling. If you want ${topic}, this ${mood} ${templateLabel} gives you the fastest path to the result. ` +
      `Lead with the biggest benefit, show one concrete outcome or example, keep the message tight, ` +
      `and finish with a clear action the viewer should take right now.`
  );
}

function estimateSceneCount(duration) {
  if (duration <= 12) {
    return 3;
  }

  if (duration <= 20) {
    return 4;
  }

  if (duration <= 35) {
    return 5;
  }

  return 6;
}

async function retryAsync(task, { retries = 2, delayMs = 600, factor = 2 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      await sleep(delayMs * Math.pow(factor, attempt));
    }
  }

  throw lastError;
}

function extractJsonObject(text) {
  const trimmed = String(text || '').trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function buildSceneVisualPrompt(scene, project) {
  const templateStyle = templateVisualStyles[project.template] || templateVisualStyles.general;
  const moodStyle = moodVisualStyles[project.mood] || moodVisualStyles.default;

  return normalizeScript(
    `${scene.prompt || scene.caption}. ` +
      `Vertical 9:16 shot for a ${project.template} video. ` +
      `${templateStyle}. ${moodStyle}. ` +
      `Single strong focal subject, cinematic composition, no on-image text, no subtitles, no watermark.`
  );
}

function canUseOpenAIText() {
  return !USE_MOCK_AI && Boolean(OPENAI_API_KEY);
}

function getImageProviderMode() {
  if (USE_MOCK_AI || !OPENAI_API_KEY) {
    return 'placeholder';
  }

  return IMAGE_PROVIDER === 'placeholder' ? 'placeholder' : 'openai';
}

function canUseOpenAIImages() {
  return getImageProviderMode() === 'openai';
}

function canUseElevenLabs() {
  return !USE_MOCK_AI && Boolean(ELEVENLABS_API_KEY);
}

function getProviderStatus() {
  return {
    mockAi: USE_MOCK_AI,
    script: {
      provider: canUseOpenAIText() ? 'openai' : 'fallback',
      enabled: canUseOpenAIText(),
    },
    visuals: {
      provider: canUseOpenAIImages() ? 'openai-image' : 'placeholder',
      enabled: canUseOpenAIImages(),
      configuredMode: IMAGE_PROVIDER,
    },
    audio: {
      provider: canUseElevenLabs() ? 'elevenlabs' : 'silent-audio',
      enabled: canUseElevenLabs(),
    },
  };
}

function publicStorageUrl(filePath) {
  const relativePath = path.relative(storageRoot, filePath).replace(/\\/g, '/');
  return `${PUBLIC_BASE_URL}/storage/${relativePath}`;
}

function escapeSubtitlePath(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return normalized.replace(':', '\\:').replace(/'/g, "\\'");
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function inferCredits(duration) {
  return duration > 30 ? 15 : 10;
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id TEXT PRIMARY KEY,
      credits INTEGER NOT NULL,
      subscription_tier TEXT NOT NULL,
      subscription_status TEXT NOT NULL,
      subscription_renewal_date TEXT,
      total_credits_used INTEGER NOT NULL DEFAULT 0,
      total_videos_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      related_project_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      notify_video_complete INTEGER NOT NULL DEFAULT 1,
      notify_credits INTEGER NOT NULL DEFAULT 1,
      notify_new_features INTEGER NOT NULL DEFAULT 0,
      notify_marketing INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      script TEXT NOT NULL,
      voice_id TEXT NOT NULL,
      voice_name TEXT NOT NULL,
      template TEXT NOT NULL,
      mood TEXT NOT NULL,
      format TEXT NOT NULL,
      duration INTEGER NOT NULL,
      status TEXT NOT NULL,
      video_url TEXT,
      thumbnail_url TEXT,
      audio_url TEXT,
      job_id TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL,
      current_step TEXT NOT NULL,
      error TEXT,
      provider TEXT NOT NULL,
      external_job_id TEXT,
      video_url TEXT,
      thumbnail_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
  `);
}

function ensureUserDefaults(userId) {
  const creditsRow = db.prepare('SELECT user_id FROM credit_balances WHERE user_id = ?').get(userId);
  if (!creditsRow) {
    const createdAt = nowIso();
    db.prepare(`
      INSERT INTO credit_balances (
        user_id, credits, subscription_tier, subscription_status,
        subscription_renewal_date, total_credits_used, total_videos_generated,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 50, 'free', 'active', null, 0, 0, createdAt, createdAt);

    db.prepare(`
      INSERT INTO credit_transactions (id, user_id, amount, type, description, related_project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, 50, 'bonus', 'Welcome bonus - 50 credits', null, createdAt);
  }

  const settingsRow = db.prepare('SELECT user_id FROM settings WHERE user_id = ?').get(userId);
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO settings (
        user_id, notify_video_complete, notify_credits, notify_new_features, notify_marketing
      ) VALUES (?, 1, 1, 0, 0)
    `).run(userId);
  }
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

function mapCredits(row) {
  return {
    userId: row.user_id,
    credits: row.credits,
    subscriptionTier: row.subscription_tier,
    subscriptionStatus: row.subscription_status,
    subscriptionRenewalDate: row.subscription_renewal_date,
    totalCreditsUsed: row.total_credits_used,
    totalVideosGenerated: row.total_videos_generated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSettings(row) {
  return {
    videoComplete: Boolean(row.notify_video_complete),
    credits: Boolean(row.notify_credits),
    newFeatures: Boolean(row.notify_new_features),
    marketing: Boolean(row.notify_marketing),
  };
}

function mapProject(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    script: row.script,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    template: row.template,
    mood: row.mood,
    format: row.format,
    duration: row.duration,
    status: row.status,
    videoUrl: row.video_url || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    audioUrl: row.audio_url || undefined,
    jobId: row.job_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: parseJson(row.metadata_json) || {},
  };
}

function mapJob(row) {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    error: row.error || undefined,
    provider: row.provider,
    externalJobId: row.external_job_id || undefined,
    videoUrl: row.video_url || undefined,
    thumbnailUrl: row.thumbnail_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getCreditsForUser(userId) {
  ensureUserDefaults(userId);
  return mapCredits(db.prepare('SELECT * FROM credit_balances WHERE user_id = ?').get(userId));
}

function getSettingsForUser(userId) {
  ensureUserDefaults(userId);
  return mapSettings(db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId));
}

function addCreditTransaction(userId, amount, type, description, relatedProjectId = null) {
  db.prepare(`
    INSERT INTO credit_transactions (id, user_id, amount, type, description, related_project_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), userId, amount, type, description, relatedProjectId, nowIso());
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = mapUser(user);
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

async function requestOpenAIChat(messages) {
  const response = await retryAsync(() => fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.6,
    }),
  }));

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function generateScriptFromAI({ prompt, mood = 'professional', duration = 15, template = 'general' }) {
  if (!canUseOpenAIText()) {
    const script = buildFallbackScript({ prompt, mood, duration, template });
    return {
      script,
      wordCount: script.split(/\s+/).filter(Boolean).length,
      estimatedDuration: duration,
      suggestions: buildScriptSuggestions(template, mood),
    };
  }

  const content = await requestOpenAIChat([
    {
      role: 'system',
      content:
        'You write high-converting short-form video scripts for reels, ads, shorts, and story videos. ' +
        'Return only the final script text. ' +
        'Write in plain spoken language with short punchy lines. ' +
        'Structure the script as: hook, value/problem, proof/example, CTA. ' +
        'Do not add labels, bullets, scene markers, emojis, or commentary. ' +
        'Make every sentence visually clear so it can later be turned into scenes.',
    },
    {
      role: 'user',
      content:
        `Create a ${mood} ${duration}-second ${template} video script about: ${prompt}\n\n` +
        `Requirements:\n` +
        `- target about ${estimateWordTarget(duration)} words\n` +
        `- first sentence must hook attention immediately\n` +
        `- focus on one core message only\n` +
        `- include one concrete proof, example, or outcome\n` +
        `- finish with a direct call to action\n` +
        `- keep lines easy to visualize on screen`,
    },
  ]);

  const script = normalizeScript(content);

  return {
    script,
    wordCount: script.split(/\s+/).filter(Boolean).length,
    estimatedDuration: duration,
    suggestions: buildScriptSuggestions(template, mood),
  };
}

async function improveScriptWithAI(script, feedback) {
  if (!canUseOpenAIText()) {
    const improved = normalizeScript(
      `${script} Rewrite this to be tighter, more engaging, easier to visualize, and end with a clearer CTA. ${feedback}`
    );
    return {
      script: improved,
      wordCount: improved.split(/\s+/).filter(Boolean).length,
      estimatedDuration: 15,
      suggestions: ['Make the first line stronger', 'Use simpler spoken wording'],
    };
  }

  const content = await requestOpenAIChat([
    {
      role: 'system',
      content:
        'You improve short-form video scripts. Return only the improved script text. ' +
        'Keep the same meaning, but rewrite for stronger hook, tighter pacing, clearer visuals, and stronger CTA. ' +
        'Use natural spoken language. Do not explain your changes.',
    },
    {
      role: 'user',
      content:
        `Rewrite this script for short-form video performance.\n\n` +
        `Script:\n${script}\n\n` +
        `Feedback:\n${feedback}\n\n` +
        `Requirements:\n` +
        `- stronger first line\n` +
        `- shorter, cleaner sentences\n` +
        `- more visual phrasing\n` +
        `- keep it concise and easy to narrate\n` +
        `- end with a stronger CTA`,
    },
  ]);

  const improved = normalizeScript(content);

  return {
    script: improved,
    wordCount: improved.split(/\s+/).filter(Boolean).length,
    estimatedDuration: 15,
    suggestions: ['Test a more specific promise in the hook', 'Trim filler words before rendering'],
  };
}

async function getVoiceCatalog() {
  if (!canUseElevenLabs()) {
    return fallbackVoices;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    return fallbackVoices;
  }

  const data = await response.json();
  return (data.voices || []).map((voice) => ({
    id: voice.voice_id,
    name: voice.name,
    category: voice.category || 'ai',
    description: voice.description || 'AI voice',
    previewUrl: voice.preview_url,
    gender: voice.labels?.gender?.toLowerCase().includes('male') ? 'male' : 'female',
    age: voice.labels?.age?.includes('old') ? 'old' : voice.labels?.age?.includes('young') ? 'young' : 'middle-aged',
    accent: voice.labels?.accent || 'American',
  }));
}

function fallbackSceneBreakdown(script, duration, mood, template) {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const sceneCount = clamp(sentences.length || 1, 3, estimateSceneCount(duration));
  const scenes = [];

  for (let index = 0; index < sceneCount; index += 1) {
    const start = Math.floor((index * sentences.length) / sceneCount);
    const end = Math.floor(((index + 1) * sentences.length) / sceneCount);
    const caption = normalizeSentence(sentences.slice(start, end).join(' ') || sentences[index] || script, `Scene ${index + 1}`);
    scenes.push({
      title: `Scene ${index + 1}`,
      caption,
      prompt: `${template} ${mood} visual showing ${caption.replace(/[.!?]$/, '')}`,
      duration: Number((duration / sceneCount).toFixed(2)),
    });
  }

  return scenes;
}

async function createSceneBreakdown(project) {
  if (!canUseOpenAIText()) {
    return fallbackSceneBreakdown(project.script, project.duration, project.mood, project.template).map((scene) => ({
      ...scene,
      prompt: buildSceneVisualPrompt(scene, project),
    }));
  }

  try {
    const content = await requestOpenAIChat([
      {
        role: 'system',
        content:
          'Return valid JSON only in this shape: {"scenes":[{"title":"...","caption":"...","prompt":"...","duration":number}]}. ' +
          'Create visual scenes for a short vertical video. ' +
          'Each caption must be short enough for subtitles and each prompt must describe a single compelling shot with no on-image text.',
      },
      {
        role: 'user',
        content:
          `Script:\n${project.script}\n\n` +
          `Mood: ${project.mood}\n` +
          `Template: ${project.template}\n` +
          `Duration: ${project.duration} seconds\n` +
          `Scene count target: ${estimateSceneCount(project.duration)}\n\n` +
          `Requirements:\n` +
          `- keep scenes visually distinct\n` +
          `- each caption should be 1 short subtitle line\n` +
          `- each prompt should describe subject, setting, camera feel, and mood\n` +
          `- no text overlays inside the image prompt`,
      },
    ]);

    const parsed = JSON.parse(extractJsonObject(content));
    const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    if (!scenes.length) {
      return fallbackSceneBreakdown(project.script, project.duration, project.mood, project.template).map((scene) => ({
        ...scene,
        prompt: buildSceneVisualPrompt(scene, project),
      }));
    }

    const totalDuration = scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0) || project.duration;
    return scenes.map((scene, index) => ({
      title: scene.title || `Scene ${index + 1}`,
      caption: normalizeSentence(scene.caption || scene.text || `Scene ${index + 1}`),
      prompt: buildSceneVisualPrompt({
        prompt: String(scene.prompt || scene.caption || project.script),
        caption: normalizeSentence(scene.caption || scene.text || `Scene ${index + 1}`),
      }, project),
      duration: Number((((Number(scene.duration || 0) || project.duration / scenes.length) / totalDuration) * project.duration).toFixed(2)),
    }));
  } catch (_error) {
    return fallbackSceneBreakdown(project.script, project.duration, project.mood, project.template).map((scene) => ({
      ...scene,
      prompt: buildSceneVisualPrompt(scene, project),
    }));
  }
}

function escapeSvgText(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function createPlaceholderImage(scene, index, outputPath) {
  const palette = gradientPalette[index % gradientPalette.length];
  const svg = `
    <svg width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${palette[0]}" />
          <stop offset="100%" stop-color="${palette[1]}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="200" cy="240" r="160" fill="rgba(255,255,255,0.08)" />
      <circle cx="920" cy="1620" r="220" fill="rgba(255,255,255,0.08)" />
      <rect x="84" y="140" width="912" height="1480" rx="44" fill="rgba(15,23,42,0.22)" stroke="rgba(255,255,255,0.18)" />
      <text x="120" y="240" font-size="34" font-family="Arial, sans-serif" fill="#E9D5FF">AI Scene ${index + 1}</text>
      <text x="120" y="340" font-size="72" font-family="Arial, sans-serif" font-weight="700" fill="#FFFFFF">${escapeSvgText(scene.title)}</text>
      <foreignObject x="120" y="410" width="840" height="360">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: white; font-size: 42px; line-height: 1.35;">
          ${escapeSvgText(scene.caption)}
        </div>
      </foreignObject>
      <foreignObject x="120" y="900" width="840" height="520">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color: rgba(255,255,255,0.82); font-size: 28px; line-height: 1.45;">
          Visual prompt: ${escapeSvgText(scene.prompt)}
        </div>
      </foreignObject>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

async function createOpenAIImage(prompt, outputPath) {
  const response = await retryAsync(() => fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: '1024x1024',
      quality: 'medium',
    }),
  }));

  if (!response.ok) {
    throw new Error(`OpenAI image request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('OpenAI image response did not include an image URL.');
  }

  const imageResponse = await retryAsync(() => fetch(imageUrl));
  if (!imageResponse.ok) {
    throw new Error('Failed to download generated image.');
  }

  await sharp(Buffer.from(await imageResponse.arrayBuffer()))
    .resize(VIDEO_WIDTH, VIDEO_HEIGHT, { fit: 'cover' })
    .png()
    .toFile(outputPath);
}

async function createSceneImage(scene, index, jobFolder) {
  const outputPath = path.join(jobFolder, `scene-${String(index + 1).padStart(2, '0')}.png`);

  if (canUseOpenAIImages()) {
    try {
      await createOpenAIImage(scene.prompt, outputPath);
      return {
        filePath: outputPath,
        url: publicStorageUrl(outputPath),
        provider: 'openai-image',
      };
    } catch (_error) {
      // Fall back to the local visual renderer.
    }
  }

  await createPlaceholderImage(scene, index, outputPath);
  return {
    filePath: outputPath,
    url: publicStorageUrl(outputPath),
    provider: 'placeholder',
  };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`));
      }
    });
  });
}

async function createSilentAudio(outputPath, duration) {
  await runFfmpeg([
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', String(duration),
    '-q:a', '9',
    '-acodec', 'libmp3lame',
    outputPath,
  ]);
}

async function generateSpeechAsset(text, voiceId, duration, jobFolder) {
  const outputPath = path.join(jobFolder, `${uuidv4()}.mp3`);
  const estimatedDuration = Math.max(8, Math.ceil((text.split(/\s+/).filter(Boolean).length / 150) * 60));

  if (!canUseElevenLabs()) {
    await createSilentAudio(outputPath, duration || estimatedDuration);
    return {
      localPath: outputPath,
      audioUrl: publicStorageUrl(outputPath),
      duration: duration || estimatedDuration,
      provider: 'silent',
    };
  }

  const response = await retryAsync(() => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  }));

  if (!response.ok) {
    throw new Error(`ElevenLabs request failed: ${response.status} ${response.statusText}`);
  }

  fs.writeFileSync(outputPath, Buffer.from(await response.arrayBuffer()));
  return {
    localPath: outputPath,
    audioUrl: publicStorageUrl(outputPath),
    duration: estimatedDuration,
    provider: 'elevenlabs',
  };
}

function buildSubtitleEntries(scenes) {
  let cursor = 0;
  return scenes.map((scene) => {
    const start = cursor;
    const end = cursor + scene.duration;
    cursor = end;
    return {
      start,
      end,
      text: scene.caption,
    };
  });
}

function formatSrtTime(totalSeconds) {
  const totalMilliseconds = Math.floor(totalSeconds * 1000);
  const hours = String(Math.floor(totalMilliseconds / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((totalMilliseconds % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((totalMilliseconds % 60000) / 1000)).padStart(2, '0');
  const milliseconds = String(totalMilliseconds % 1000).padStart(3, '0');
  return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

function writeSubtitleFile(entries, outputPath) {
  const content = entries
    .map((entry, index) => [
      String(index + 1),
      `${formatSrtTime(entry.start)} --> ${formatSrtTime(entry.end)}`,
      entry.text,
      '',
    ].join('\n'))
    .join('\n');

  fs.writeFileSync(outputPath, content, 'utf8');
}

async function renderSceneClip(imagePath, duration, outputPath, sceneIndex) {
  const frames = Math.max(1, Math.round(duration * 30));
  const zoomExpression = sceneIndex % 2 === 0 ? "min(zoom+0.0009,1.12)" : "if(lte(zoom,1.0),1.08,max(1.0,zoom-0.0007))";
  const xExpression = sceneIndex % 2 === 0 ? 'iw/2-(iw/zoom/2)' : 'max(0,iw-(iw/zoom)-120)';
  const yExpression = sceneIndex % 3 === 0 ? 'ih/2-(ih/zoom/2)' : 'max(0,ih-(ih/zoom)-180)';
  await runFfmpeg([
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-vf',
    `zoompan=z='${zoomExpression}':x='${xExpression}':y='${yExpression}':d=${frames}:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:fps=30,format=yuv420p`,
    '-t', String(duration),
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    outputPath,
  ]);
}

async function concatenateSceneClips(sceneClipPaths, outputPath, jobFolder) {
  const concatListPath = path.join(jobFolder, 'concat.txt');
  const concatContent = sceneClipPaths
    .map((clipPath) => `file '${clipPath.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(concatListPath, concatContent, 'utf8');

  await runFfmpeg([
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    outputPath,
  ]);
}

async function composeFinalVideo(baseVideoPath, audioPath, subtitlePath, outputPath) {
  await runFfmpeg([
    '-y',
    '-i', baseVideoPath,
    '-i', audioPath,
    '-vf', `subtitles='${escapeSubtitlePath(subtitlePath)}'`,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    outputPath,
  ]);
}

function updateJob(jobId, updates) {
  const existing = db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(jobId);
  if (!existing) {
    return;
  }

  const next = {
    status: updates.status ?? existing.status,
    progress: updates.progress ?? existing.progress,
    currentStep: updates.currentStep ?? existing.current_step,
    error: updates.error ?? existing.error,
    provider: updates.provider ?? existing.provider,
    externalJobId: updates.externalJobId ?? existing.external_job_id,
    videoUrl: updates.videoUrl ?? existing.video_url,
    thumbnailUrl: updates.thumbnailUrl ?? existing.thumbnail_url,
    updatedAt: nowIso(),
  };

  db.prepare(`
    UPDATE generation_jobs
    SET status = ?, progress = ?, current_step = ?, error = ?, provider = ?,
        external_job_id = ?, video_url = ?, thumbnail_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    next.status,
    next.progress,
    next.currentStep,
    next.error,
    next.provider,
    next.externalJobId,
    next.videoUrl,
    next.thumbnailUrl,
    next.updatedAt,
    jobId
  );
}

function updateProject(projectId, updates) {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!existing) {
    return;
  }

  const metadataJson = updates.metadata ? JSON.stringify(updates.metadata) : existing.metadata_json;

  db.prepare(`
    UPDATE projects
    SET title = ?, script = ?, voice_id = ?, voice_name = ?, template = ?, mood = ?,
        format = ?, duration = ?, status = ?, video_url = ?, thumbnail_url = ?,
        audio_url = ?, job_id = ?, metadata_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updates.title ?? existing.title,
    updates.script ?? existing.script,
    updates.voiceId ?? existing.voice_id,
    updates.voiceName ?? existing.voice_name,
    updates.template ?? existing.template,
    updates.mood ?? existing.mood,
    updates.format ?? existing.format,
    updates.duration ?? existing.duration,
    updates.status ?? existing.status,
    updates.videoUrl ?? existing.video_url,
    updates.thumbnailUrl ?? existing.thumbnail_url,
    updates.audioUrl ?? existing.audio_url,
    updates.jobId ?? existing.job_id,
    metadataJson,
    nowIso(),
    projectId
  );
}

async function processVideoJob(jobId) {
  const jobRow = db.prepare('SELECT * FROM generation_jobs WHERE id = ?').get(jobId);
  if (!jobRow) {
    return;
  }

  const projectRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(jobRow.project_id);
  if (!projectRow) {
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      currentStep: 'Missing project',
      error: 'Project not found.',
    });
    return;
  }

  const project = mapProject(projectRow);
  const creditBalance = db.prepare('SELECT * FROM credit_balances WHERE user_id = ?').get(project.userId);
  const requiredCredits = inferCredits(project.duration);

  if (!creditBalance || creditBalance.credits < requiredCredits) {
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      currentStep: 'Insufficient credits',
      error: 'Not enough credits to render this video.',
    });
    updateProject(project.id, { status: 'failed', jobId });
    return;
  }

  const jobFolder = path.join(renderDir, jobId);
  fs.mkdirSync(jobFolder, { recursive: true });

  try {
    updateJob(jobId, { status: 'processing', progress: 10, currentStep: 'Breaking script into scenes' });
    updateProject(project.id, { status: 'processing', jobId });

    const scenes = await createSceneBreakdown(project);
    const subtitles = buildSubtitleEntries(scenes);

    updateJob(jobId, { progress: 30, currentStep: 'Generating scene visuals' });
    const imageOutputs = [];
    const sceneClipPaths = [];

    for (let index = 0; index < scenes.length; index += 1) {
      const imageOutput = await createSceneImage(scenes[index], index, jobFolder);
      imageOutputs.push(imageOutput);

      const clipPath = path.join(jobFolder, `clip-${String(index + 1).padStart(2, '0')}.mp4`);
      await renderSceneClip(imageOutput.filePath, scenes[index].duration, clipPath, index);
      sceneClipPaths.push(clipPath);
    }

    updateJob(jobId, { progress: 55, currentStep: 'Generating voiceover' });
    const audioAsset = await generateSpeechAsset(project.script, project.voiceId, project.duration, jobFolder);

    updateJob(jobId, { progress: 75, currentStep: 'Composing final video' });
    const stitchedVideoPath = path.join(jobFolder, 'stitched.mp4');
    await concatenateSceneClips(sceneClipPaths, stitchedVideoPath, jobFolder);

    const subtitlePath = path.join(subtitleDir, `${jobId}.srt`);
    writeSubtitleFile(subtitles, subtitlePath);

    updateJob(jobId, { progress: 90, currentStep: 'Burning subtitles' });
    const finalVideoPath = path.join(videoDir, `${jobId}.mp4`);
    await composeFinalVideo(stitchedVideoPath, audioAsset.localPath, subtitlePath, finalVideoPath);

    const visualProvider = imageOutputs.some((entry) => entry.provider === 'openai-image')
      ? 'openai-image'
      : 'placeholder';

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Video ready',
      provider: visualProvider,
      videoUrl: publicStorageUrl(finalVideoPath),
      thumbnailUrl: imageOutputs[0]?.url,
    });

    updateProject(project.id, {
      status: 'completed',
      videoUrl: publicStorageUrl(finalVideoPath),
      thumbnailUrl: imageOutputs[0]?.url,
      audioUrl: audioAsset.audioUrl,
      jobId,
      metadata: {
        ...(project.metadata || {}),
        credits: requiredCredits,
        sceneCount: scenes.length,
        scriptProvider: canUseOpenAIText() ? 'openai' : 'fallback',
        audioProvider: audioAsset.provider,
        visualProvider,
        qualityTier: visualProvider === 'openai-image' || audioAsset.provider === 'elevenlabs' ? 'enhanced' : 'standard',
        subtitles,
        scenes: scenes.map((scene, index) => ({
          ...scene,
          imageUrl: imageOutputs[index]?.url,
        })),
      },
    });

    db.prepare(`
      UPDATE credit_balances
      SET credits = credits - ?, total_credits_used = total_credits_used + ?,
          total_videos_generated = total_videos_generated + 1, updated_at = ?
      WHERE user_id = ?
    `).run(requiredCredits, requiredCredits, nowIso(), project.userId);

    addCreditTransaction(
      project.userId,
      -requiredCredits,
      'usage',
      `Video generation - ${requiredCredits} credits`,
      project.id
    );
  } catch (error) {
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      currentStep: 'Generation failed',
      error: error.message || 'Unknown generation error.',
    });
    updateProject(project.id, {
      status: 'failed',
      jobId,
      metadata: {
        ...(project.metadata || {}),
        lastError: error.message || 'Unknown generation error.',
      },
    });
  }
}

function enqueueJob(jobId) {
  if (!jobQueue.includes(jobId)) {
    jobQueue.push(jobId);
  }
  void processJobQueue();
}

function rehydrateQueuedJobs() {
  db.prepare(`
    UPDATE generation_jobs
    SET status = 'queued', current_step = 'Resuming queued job', updated_at = ?
    WHERE status = 'processing'
  `).run(nowIso());

  const rows = db.prepare(`
    SELECT id FROM generation_jobs
    WHERE status = 'queued'
    ORDER BY datetime(created_at) ASC
  `).all();

  rows.forEach((row) => enqueueJob(row.id));
}

async function processJobQueue() {
  if (isProcessingQueue) {
    return;
  }

  isProcessingQueue = true;

  while (jobQueue.length > 0) {
    const nextJobId = jobQueue.shift();
    try {
      await processVideoJob(nextJobId);
    } catch (error) {
      console.error('Video job failed:', error);
    }
  }

  isProcessingQueue = false;
}

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/storage', express.static(storageRoot));

initDatabase();
rehydrateQueuedJobs();

app.get('/api/health', (_req, res) => {
  const providers = getProviderStatus();
  res.json({
    ok: true,
    providerMode: providers.visuals.provider,
    audioMode: providers.audio.provider,
    mockAi: providers.mockAi,
    providers,
  });
});

app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
  });

  try {
    const payload = schema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(payload.email.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(payload.password, 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, payload.name, payload.email.toLowerCase(), passwordHash, nowIso());

    ensureUserDefaults(userId);
    const user = mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));

    res.status(201).json({
      token: createToken(user),
      user,
      credits: getCreditsForUser(userId),
      settings: getSettingsForUser(userId),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid request.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  try {
    const payload = schema.parse(req.body);
    const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email.toLowerCase());
    if (!userRow) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(payload.password, userRow.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = mapUser(userRow);
    ensureUserDefaults(user.id);

    res.json({
      token: createToken(user),
      user,
      credits: getCreditsForUser(user.id),
      settings: getSettingsForUser(user.id),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid request.' });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    credits: getCreditsForUser(req.user.id),
    settings: getSettingsForUser(req.user.id),
  });
});

app.get('/api/projects', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM projects
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
  `).all(req.user.id);
  res.json(rows.map(mapProject));
});

app.post('/api/projects', requireAuth, (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    script: z.string().min(3),
    voiceId: z.string().min(2),
    voiceName: z.string().min(2),
    template: z.string().min(2),
    mood: z.string().min(2),
    format: z.enum(['9:16', '1:1', '16:9']).optional(),
    duration: z.number().int().positive().max(180).optional(),
  });

  try {
    const payload = schema.parse(req.body);
    const projectId = uuidv4();
    const timestamp = nowIso();
    const duration = payload.duration || 15;

    db.prepare(`
      INSERT INTO projects (
        id, user_id, title, script, voice_id, voice_name, template, mood,
        format, duration, status, video_url, thumbnail_url, audio_url, job_id,
        metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      req.user.id,
      payload.title,
      payload.script,
      payload.voiceId,
      payload.voiceName,
      payload.template,
      payload.mood,
      payload.format || '9:16',
      duration,
      'draft',
      null,
      null,
      null,
      null,
      JSON.stringify({
        wordCount: payload.script.split(/\s+/).filter(Boolean).length,
        views: 0,
        downloads: 0,
        credits: inferCredits(duration),
      }),
      timestamp,
      timestamp
    );

    res.status(201).json(mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId)));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create project.' });
  }
});

app.get('/api/projects/stats', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects WHERE user_id = ?').all(req.user.id);
  const projects = rows.map(mapProject);
  res.json({
    total: projects.length,
    completed: projects.filter((project) => project.status === 'completed').length,
    processing: projects.filter((project) => project.status === 'processing').length,
    totalViews: projects.reduce((sum, project) => sum + Number(project.metadata?.views || 0), 0),
    totalDownloads: projects.reduce((sum, project) => sum + Number(project.metadata?.downloads || 0), 0),
  });
});

app.get('/api/projects/:projectId', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Project not found.' });
  }
  res.json(mapProject(row));
});

app.patch('/api/projects/:projectId', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const schema = z.object({
    title: z.string().min(2).optional(),
    script: z.string().min(3).optional(),
    status: z.enum(['draft', 'processing', 'completed', 'failed']).optional(),
    videoUrl: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
    audioUrl: z.string().optional(),
    jobId: z.string().optional(),
  });

  try {
    const payload = schema.parse(req.body);
    updateProject(req.params.projectId, payload);
    res.json(mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId)));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update project.' });
  }
});

app.post('/api/projects/:projectId/view', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const project = mapProject(row);
  updateProject(project.id, {
    metadata: {
      ...(project.metadata || {}),
      views: Number(project.metadata?.views || 0) + 1,
    },
  });
  res.json({ ok: true });
});

app.post('/api/projects/:projectId/download', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const project = mapProject(row);
  updateProject(project.id, {
    metadata: {
      ...(project.metadata || {}),
      downloads: Number(project.metadata?.downloads || 0) + 1,
    },
  });
  res.json({ ok: true });
});

app.delete('/api/projects/:projectId', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.projectId, req.user.id);
  if (!row) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  db.prepare('DELETE FROM generation_jobs WHERE project_id = ?').run(req.params.projectId);
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ ok: true });
});

app.get('/api/credits', requireAuth, (req, res) => {
  res.json(getCreditsForUser(req.user.id));
});

app.get('/api/credits/transactions', requireAuth, (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
  const rows = db.prepare(`
    SELECT * FROM credit_transactions
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC
    LIMIT ?
  `).all(req.user.id, limit);

  res.json(rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    type: row.type,
    description: row.description,
    relatedProjectId: row.related_project_id || undefined,
    createdAt: row.created_at,
  })));
});

app.get('/api/subscription/plans', requireAuth, (_req, res) => {
  res.json(subscriptionPlans);
});

app.post('/api/subscription', requireAuth, (req, res) => {
  const schema = z.object({
    planId: z.string(),
  });

  try {
    const payload = schema.parse(req.body);
    const plan = subscriptionPlans.find((entry) => entry.id === payload.planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + 1);
    db.prepare(`
      UPDATE credit_balances
      SET credits = credits + ?, subscription_tier = ?, subscription_status = ?,
          subscription_renewal_date = ?, updated_at = ?
      WHERE user_id = ?
    `).run(plan.credits, plan.tier, 'active', renewalDate.toISOString(), nowIso(), req.user.id);

    addCreditTransaction(req.user.id, plan.credits, 'subscription', `${plan.name} subscription credits`);
    res.json(getCreditsForUser(req.user.id));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid request.' });
  }
});

app.get('/api/settings', requireAuth, (req, res) => {
  res.json({
    profile: req.user,
    notifications: getSettingsForUser(req.user.id),
  });
});

app.patch('/api/settings', requireAuth, (req, res) => {
  const schema = z.object({
    notifications: z.object({
      videoComplete: z.boolean(),
      credits: z.boolean(),
      newFeatures: z.boolean(),
      marketing: z.boolean(),
    }),
  });

  try {
    const payload = schema.parse(req.body);
    db.prepare(`
      UPDATE settings
      SET notify_video_complete = ?, notify_credits = ?, notify_new_features = ?, notify_marketing = ?
      WHERE user_id = ?
    `).run(
      payload.notifications.videoComplete ? 1 : 0,
      payload.notifications.credits ? 1 : 0,
      payload.notifications.newFeatures ? 1 : 0,
      payload.notifications.marketing ? 1 : 0,
      req.user.id
    );

    res.json({
      profile: req.user,
      notifications: getSettingsForUser(req.user.id),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid request.' });
  }
});

app.get('/api/voices', requireAuth, async (_req, res) => {
  try {
    res.json(await getVoiceCatalog());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load voices.' });
  }
});

app.post('/api/scripts/generate', requireAuth, async (req, res) => {
  const schema = z.object({
    prompt: z.string().min(3),
    mood: z.string().optional(),
    duration: z.number().optional(),
    template: z.string().optional(),
  });

  try {
    const payload = schema.parse(req.body);
    res.json(await generateScriptFromAI(payload));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to generate script.' });
  }
});

app.post('/api/scripts/improve', requireAuth, async (req, res) => {
  const schema = z.object({
    script: z.string().min(3),
    feedback: z.string().min(3),
  });

  try {
    const payload = schema.parse(req.body);
    res.json(await improveScriptWithAI(payload.script, payload.feedback));
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to improve script.' });
  }
});

app.post('/api/jobs/video', requireAuth, async (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    script: z.string().min(3),
    voiceId: z.string().min(2),
    template: z.string().min(2),
    mood: z.string().min(2),
    format: z.enum(['9:16', '1:1', '16:9']).optional(),
    duration: z.number().int().positive().max(180).optional(),
  });

  try {
    const payload = schema.parse(req.body);
    const voices = await getVoiceCatalog();
    const selectedVoice =
      voices.find((voice) => voice.id === payload.voiceId) ||
      voices[0] ||
      fallbackVoices[0];
    const projectId = uuidv4();
    const jobId = uuidv4();
    const timestamp = nowIso();
    const duration = payload.duration || 15;

    db.prepare(`
      INSERT INTO projects (
        id, user_id, title, script, voice_id, voice_name, template, mood,
        format, duration, status, video_url, thumbnail_url, audio_url, job_id,
        metadata_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectId,
      req.user.id,
      payload.title,
      payload.script,
      selectedVoice.id,
      selectedVoice.name,
      payload.template,
      payload.mood,
      payload.format || '9:16',
      duration,
      'processing',
      null,
      null,
      null,
      jobId,
      JSON.stringify({
        wordCount: payload.script.split(/\s+/).filter(Boolean).length,
        views: 0,
        downloads: 0,
        credits: inferCredits(duration),
      }),
      timestamp,
      timestamp
    );

    db.prepare(`
      INSERT INTO generation_jobs (
        id, user_id, project_id, status, progress, current_step, error, provider,
        external_job_id, video_url, thumbnail_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      req.user.id,
      projectId,
      'queued',
      0,
      'Queued',
      null,
      canUseOpenAIImages() ? 'openai-image' : 'placeholder',
      null,
      null,
      null,
      timestamp,
      timestamp
    );

    enqueueJob(jobId);
    res.status(202).json({
      jobId,
      projectId,
      status: 'queued',
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to queue job.' });
  }
});

app.get('/api/jobs/:jobId', requireAuth, (req, res) => {
  const jobRow = db.prepare(`
    SELECT * FROM generation_jobs
    WHERE id = ? AND user_id = ?
  `).get(req.params.jobId, req.user.id);

  if (!jobRow) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  const projectRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(jobRow.project_id);
  res.json({
    job: mapJob(jobRow),
    project: projectRow ? mapProject(projectRow) : null,
  });
});

const server = app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

