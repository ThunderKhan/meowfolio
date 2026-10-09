import { useEffect, useState } from 'react';

/** Only public repository metadata is requested: no cat images or local data. */
export const MEOWFOLIO_REPO_URL = 'https://github.com/ThunderKhan/meowfolio';
export const CREATOR_GITHUB_URL = 'https://github.com/ThunderKhan';
const STARS_API = 'https://api.github.com/repos/ThunderKhan/meowfolio';
const STARS_CACHE_KEY = 'meowfolio.github-stars.v1';
const STARS_CACHE_MS = 15 * 60 * 1000;

interface StarsCache { count: number; savedAt: number }

function validStarCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function readCachedStars(): number | null {
  try {
    const cached: StarsCache = JSON.parse(sessionStorage.getItem(STARS_CACHE_KEY) ?? 'null');
    if (cached && validStarCount(cached.count) && typeof cached.savedAt === 'number' &&
        Date.now() >= cached.savedAt && Date.now() - cached.savedAt < STARS_CACHE_MS) {
      return cached.count;
    }
  } catch {
    // Session storage is optional, including in browsers that disable it.
  }
  return null;
}

function useRepositoryStars(): number | null {
  const [stars, setStars] = useState<number | null>(readCachedStars);

  useEffect(() => {
    if (stars !== null) return;
    const controller = new AbortController();
    void fetch(STARS_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || !('stargazers_count' in data) ||
          !validStarCount(data.stargazers_count)) return;
      if (controller.signal.aborted) return;
      setStars(data.stargazers_count);
      try {
        sessionStorage.setItem(STARS_CACHE_KEY, JSON.stringify({
          count: data.stargazers_count, savedAt: Date.now(),
        } satisfies StarsCache));
      } catch {
        // Never block navigation because browser storage is unavailable.
      }
    }).catch(() => {
      // Network offline, rate limits, and blocked third-party requests must
      // not show a fictional 0-star count or prevent opening the repository.
    });
    return () => controller.abort();
  }, [stars]);

  return stars;
}

interface SiteNavProps {
  onHome: () => void;
  onCats: () => void;
  onAddCat?: () => void;
  current?: 'home' | 'cats' | 'studio';
}

export function SiteNav({ onHome, onCats, onAddCat, current = 'home' }: SiteNavProps) {
  const stars = useRepositoryStars();
  return (
    <nav className="meow-nav" aria-label="Primary navigation">
      <button type="button" className={'meow-nav-link' + (current === 'home' ? ' is-current' : '')}
        aria-current={current === 'home' ? 'page' : undefined} onClick={onHome}>
        <span aria-hidden="true">⌂</span><span>Home</span>
      </button>
      <button type="button" className={'meow-nav-link' + (current === 'cats' ? ' is-current' : '')}
        aria-current={current === 'cats' ? 'page' : undefined} onClick={onCats}>
        <span aria-hidden="true">♡</span><span>Cats</span>
      </button>
      {onAddCat && (
        <button type="button" className="meow-nav-link meow-nav-add" onClick={onAddCat}>
          <span aria-hidden="true">＋</span><span>Add cat</span>
        </button>
      )}
      <a href={MEOWFOLIO_REPO_URL} className="meow-nav-github" target="_blank" rel="noopener noreferrer"
        aria-label={stars === null
          ? 'Meowfolio source code on GitHub (opens in a new tab)'
          : 'Meowfolio on GitHub, ' + stars + ' stars (opens in a new tab)'}
        title="Source code · Star Meowfolio on GitHub">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.5-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.79 1.18 3.26.8.1-.73.4-1.23.73-1.51-2.5-.28-5.14-1.25-5.14-5.55 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.1-2.97 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.6 1.54.22 2.69.1 2.97.72.79 1.16 1.79 1.16 3.02 0 4.31-2.64 5.27-5.16 5.54.41.36.78 1.06.78 2.14v3.19c0 .3.2.65.78.54A11.2 11.2 0 0 0 12 .8Z" />
        </svg>
        <span className="meow-nav-github-name">GitHub</span>
        <span className="meow-nav-stars" aria-hidden="true">★{stars === null ? '' : ' ' + stars.toLocaleString('en-US')}</span>
      </a>
    </nav>
  );
}
