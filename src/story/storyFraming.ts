/**
 * Shared photo framing math for the 1080 × 1920 story preview and PNG export.
 * Positions are percentages of the available image overflow, not hardcoded
 * image pixels. This keeps drag and keyboard placement deterministic.
 */
export type StoryPhotoSource = 'original' | 'closeup';
export type StoryPhotoFit = 'contain' | 'cover';

export interface StoryPhotoSettings {
  source: StoryPhotoSource;
  fit: StoryPhotoFit;
  zoom: number; // percentage, 100–300
  positionX: number; // -100 (left) to 100 (right)
  positionY: number; // -100 (top) to 100 (bottom)
}

export const DEFAULT_STORY_PHOTO: StoryPhotoSettings = {
  source: 'original',
  fit: 'contain',
  zoom: 100,
  positionX: 0,
  positionY: 0,
};

export const STORY_PHOTO_FRAME = { x: 130, y: 365, size: 805 } as const;

export function clampPosition(value: number): number {
  return Number.isFinite(value) ? Math.max(-100, Math.min(100, value)) : 0;
}

export function photoPlacement(
  width: number,
  height: number,
  settings: StoryPhotoSettings,
): {
  x: number; y: number; width: number; height: number;
  maxOffsetX: number; maxOffsetY: number;
} {
  if (!(width > 0 && height > 0)) throw new Error('The selected photo has invalid dimensions.');
  const size = STORY_PHOTO_FRAME.size;
  const fit = settings.fit === 'cover'
    ? Math.max(size / width, size / height)
    : Math.min(size / width, size / height);
  const zoom = Number.isFinite(settings.zoom)
    ? Math.max(100, Math.min(300, settings.zoom)) / 100
    : 1;
  const drawnWidth = width * fit * zoom;
  const drawnHeight = height * fit * zoom;
  const maxOffsetX = Math.max(0, (drawnWidth - size) / 2);
  const maxOffsetY = Math.max(0, (drawnHeight - size) / 2);
  return {
    x: STORY_PHOTO_FRAME.x + (size - drawnWidth) / 2 + maxOffsetX * clampPosition(settings.positionX) / 100,
    y: STORY_PHOTO_FRAME.y + (size - drawnHeight) / 2 + maxOffsetY * clampPosition(settings.positionY) / 100,
    width: drawnWidth,
    height: drawnHeight,
    maxOffsetX,
    maxOffsetY,
  };
}
