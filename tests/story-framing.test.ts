import { describe, expect, it } from 'vitest';
import { DEFAULT_STORY_PHOTO, photoPlacement, STORY_PHOTO_FRAME } from '../src/story/storyFraming';

describe('story photo placement', () => {
  it('fits an entire portrait without clipping at the default zoom', () => {
    const placement = photoPlacement(600, 1200, DEFAULT_STORY_PHOTO);
    expect(placement.height).toBe(STORY_PHOTO_FRAME.size);
    expect(placement.width).toBe(STORY_PHOTO_FRAME.size / 2);
    expect(placement.x).toBeGreaterThan(STORY_PHOTO_FRAME.x);
    expect(placement.maxOffsetX).toBe(0);
    expect(placement.maxOffsetY).toBe(0);
  });

  it('fits an entire landscape without clipping at the default zoom', () => {
    const placement = photoPlacement(1200, 600, DEFAULT_STORY_PHOTO);
    expect(placement.width).toBe(STORY_PHOTO_FRAME.size);
    expect(placement.height).toBe(STORY_PHOTO_FRAME.size / 2);
    expect(placement.y).toBeGreaterThan(STORY_PHOTO_FRAME.y);
    expect(placement.maxOffsetX).toBe(0);
    expect(placement.maxOffsetY).toBe(0);
  });

  it('allows moving the upper portrait into view using Fill and vertical pan', () => {
    const top = photoPlacement(600, 1200, {
      ...DEFAULT_STORY_PHOTO, fit: 'cover', positionY: 100,
    });
    const bottom = photoPlacement(600, 1200, {
      ...DEFAULT_STORY_PHOTO, fit: 'cover', positionY: -100,
    });
    expect(top.height).toBeGreaterThan(STORY_PHOTO_FRAME.size);
    expect(top.maxOffsetY).toBeGreaterThan(0);
    expect(top.y).toBeCloseTo(STORY_PHOTO_FRAME.y);
    expect(bottom.y + bottom.height).toBeCloseTo(STORY_PHOTO_FRAME.y + STORY_PHOTO_FRAME.size);
  });

  it('zoom makes panning possible in both directions without exposing blank space', () => {
    const topLeft = photoPlacement(400, 400, {
      ...DEFAULT_STORY_PHOTO, zoom: 200, positionX: 100, positionY: 100,
    });
    const bottomRight = photoPlacement(400, 400, {
      ...DEFAULT_STORY_PHOTO, zoom: 200, positionX: -100, positionY: -100,
    });
    expect(topLeft.x).toBeCloseTo(STORY_PHOTO_FRAME.x);
    expect(topLeft.y).toBeCloseTo(STORY_PHOTO_FRAME.y);
    expect(bottomRight.x + bottomRight.width).toBeCloseTo(STORY_PHOTO_FRAME.x + STORY_PHOTO_FRAME.size);
    expect(bottomRight.y + bottomRight.height).toBeCloseTo(STORY_PHOTO_FRAME.y + STORY_PHOTO_FRAME.size);
  });

  it('clamps invalid zoom and position values safely', () => {
    const clamped = photoPlacement(500, 500, {
      ...DEFAULT_STORY_PHOTO, zoom: 999, positionX: 999, positionY: -999,
    });
    const expected = photoPlacement(500, 500, {
      ...DEFAULT_STORY_PHOTO, zoom: 300, positionX: 100, positionY: -100,
    });
    expect(clamped).toEqual(expected);
    expect(() => photoPlacement(0, 0, DEFAULT_STORY_PHOTO)).toThrow();
  });
});
