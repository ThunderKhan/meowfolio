/** A device-only personalization record, not an authenticated web account. */
export interface LocalProfile {
  displayName: string;
  avatar: '🐱' | '🌷' | '⭐' | '🎀';
  createdAt: number;
}

export const PROFILE_KEY = 'meowfolio.local-profile.v1';

export function validateDisplayName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Enter the name you want on your scrapbook.';
  if (Array.from(name).length > 32) return 'Use 32 characters or fewer.';
  return null;
}

export function readLocalProfile(): LocalProfile | null {
  try {
    const text = localStorage.getItem(PROFILE_KEY);
    if (!text) return null;
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.displayName !== 'string' || validateDisplayName(value.displayName)) return null;
    if (!['🐱', '🌷', '⭐', '🎀'].includes(String(value.avatar))) return null;
    return {
      displayName: value.displayName.trim(),
      avatar: value.avatar as LocalProfile['avatar'],
      createdAt: typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeLocalProfile(profile: LocalProfile): void {
  const problem = validateDisplayName(profile.displayName);
  if (problem) throw new Error(problem);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
