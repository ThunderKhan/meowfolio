import type { CatRecord, EncounterRecord } from '../storage/types';
import { photoPlacement, STORY_PHOTO_FRAME, type StoryPhotoSettings } from './storyFraming';

export type StoryTheme = 'candy' | 'midnight' | 'buttercream';
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

interface StoryInput {
  cat: Pick<CatRecord, 'name' | 'encounterCount'>;
  encounter: Pick<EncounterRecord, 'timestamp' | 'crop' | 'photo' | 'note'>;
  ownerName: string | null;
  theme: StoryTheme;
  includeNote: boolean;
  photoSettings: StoryPhotoSettings;
}

function containText(value: string, maxLength: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  const chars = Array.from(clean);
  return chars.length > maxLength ? chars.slice(0, maxLength - 1).join('') + '…' : clean;
}

function centerText(ctx: CanvasRenderingContext2D, text: string, y: number, maxWidth: number) {
  ctx.fillText(text, STORY_WIDTH / 2, y, maxWidth);
}

function drawFramedPhoto(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  settings: StoryPhotoSettings,
  frameColor: string,
  frameInk: string,
): void {
  const { x, y, size } = STORY_PHOTO_FRAME;
  const placement = photoPlacement(bitmap.width, bitmap.height, settings);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // A color-matched mat is shown around the *whole* photo in Fit mode,
  // instead of cropping the cat just to fill a square.
  ctx.fillStyle = frameColor;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = frameInk;
  ctx.globalAlpha = 0.12;
  for (let line = x - size; line < x + size * 2; line += 28) {
    ctx.beginPath();
    ctx.moveTo(line, y);
    ctx.lineTo(line + size, y + size);
    ctx.strokeStyle = frameInk;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, placement.x, placement.y, placement.width, placement.height);
  ctx.restore();
  ctx.strokeStyle = frameInk;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lines: number): string[] {
  const output: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? current + ' ' + word : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      output.push(current);
      current = word;
      if (output.length >= lines) break;
    } else {
      current = candidate;
    }
  }
  if (output.length < lines && current) output.push(current);
  return output.slice(0, lines);
}

/** All drawing is done in the browser. No photos/notes/coordinates are uploaded. */
export async function renderStoryCard(input: StoryInput): Promise<Blob> {
  const image = input.photoSettings.source === 'closeup' ? input.encounter.crop : input.encounter.photo;
  const bitmap = await createImageBitmap(image);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser cannot generate a story card.');

    const night = input.theme === 'midnight';
    const butter = input.theme === 'buttercream';
    const bg = night ? '#322248' : butter ? '#f9dfaf' : '#ffe4ef';
    const paper = night ? '#4b365e' : butter ? '#fff8e5' : '#fff8fb';
    const ink = night ? '#fff5fc' : butter ? '#694132' : '#642343';
    const accent = night ? '#ffb7de' : butter ? '#b76940' : '#b52873';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    const glow = ctx.createRadialGradient(200, 270, 30, 500, 850, 1150);
    glow.addColorStop(0, night ? '#7c4679' : butter ? '#fff2cc' : '#ffd1e5');
    glow.addColorStop(1, bg);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    // Dotted paper texture makes the exported image feel tactile.
    ctx.fillStyle = night ? 'rgba(255,215,241,0.12)' : butter ? 'rgba(121,78,50,0.14)' : 'rgba(157,58,109,0.12)';
    for (let y = 35; y < STORY_HEIGHT; y += 40) {
      for (let x = 32; x < STORY_WIDTH; x += 40) ctx.fillRect(x, y, 3, 3);
    }

    ctx.save();
    ctx.translate(540, 975);
    ctx.rotate(night ? 0.022 : -0.022);
    ctx.translate(-540, -975);
    ctx.fillStyle = night ? '#20172e' : butter ? '#b78864' : '#be6c96';
    ctx.fillRect(106, 258, 888, 1290);
    ctx.fillStyle = paper;
    ctx.fillRect(88, 240, 888, 1290);

    ctx.fillStyle = ink;
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('♥  MEOWFOLIO / MEMORY_001', 132, 308);
    ctx.fillStyle = accent;
    ctx.fillRect(130, 333, 805, 5);

    drawFramedPhoto(ctx, bitmap, input.photoSettings, night ? '#785b82' : butter ? '#f6dfbd' : '#f6c2dc', accent);
    ctx.fillStyle = accent;
    ctx.font = 'bold 40px monospace';
    ctx.fillText('✦ A LITTLE CAT I MET ✦', 132, 1240);

    const catName = containText(input.cat.name, 32);
    ctx.fillStyle = ink;
    ctx.font = 'bold 92px monospace';
    ctx.fillText(catName, 127, 1360, 795);
    ctx.fillStyle = accent;
    ctx.font = 'bold 30px monospace';
    const day = new Date(input.encounter.timestamp).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    ctx.fillText(day.toUpperCase() + '   •   MET ' + input.cat.encounterCount + 'x', 132, 1435);
    ctx.restore();

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    if (input.includeNote && input.encounter.note?.trim()) {
      ctx.font = 'bold 34px monospace';
      wrap(ctx, containText(input.encounter.note, 125), 860, 3)
        .forEach((line, i) => centerText(ctx, line, 1640 + i * 52, 860));
    } else {
      ctx.font = 'bold 39px monospace';
      centerText(ctx, 'tiny encounters, forever remembered ♡', 1680, 900);
    }
    ctx.fillStyle = accent;
    ctx.font = 'bold 30px monospace';
    const owner = containText(input.ownerName || 'a cat-loving human', 26);
    centerText(ctx, '♡ collected by ' + owner, 1810, 960);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Story image could not be saved.')), 'image/png'),
    );
  } finally {
    bitmap.close();
  }
}
