/** Browser-native URLs for each meaningful Meowfolio screen.
 * Preserve unrelated query parameters (including opt-in evaluation fixtures)
 * while keeping the selected cat and collection restorable after refresh.
 */
export type AppRoute =
  | { screen: 'home' | 'cats' | 'scan' }
  | { screen: 'cat' | 'studio'; catId: string };

const HISTORY_KEY = 'meowfolioNavigation';

export function readRoute(location: Pick<Location, 'pathname' | 'search'>): AppRoute {
  const studio = location.pathname.match(/^\/studio\/([^/]+)\/?$/);
  if (studio) {
    try {
      const catId = decodeURIComponent(studio[1]);
      if (catId) return { screen: 'studio', catId };
    } catch {
      // Invalid external deep links fall back to Home.
    }
  }

  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'cats') return { screen: 'cats' };
  if (params.get('view') === 'cat' && params.get('cat')) {
    return { screen: 'cat', catId: params.get('cat')! };
  }
  if (params.get('view') === 'scan') return { screen: 'scan' };
  return { screen: 'home' };
}

export function routeUrl(route: AppRoute, location: Pick<Location, 'search' | 'hash'>): string {
  const params = new URLSearchParams(location.search);
  params.delete('view');
  params.delete('cat');

  let pathname = '/';
  if (route.screen === 'studio') {
    pathname = '/studio/' + encodeURIComponent(route.catId);
  } else if (route.screen === 'cat') {
    params.set('view', 'cat');
    params.set('cat', route.catId);
  } else if (route.screen !== 'home') {
    params.set('view', route.screen);
  }

  const query = params.toString();
  return pathname + (query ? '?' + query : '') + location.hash;
}

function appState(state: unknown): { hasPrevious: boolean } | null {
  if (!state || typeof state !== 'object' || !(HISTORY_KEY in state)) return null;
  const candidate = (state as Record<string, unknown>)[HISTORY_KEY];
  if (!candidate || typeof candidate !== 'object' || !('hasPrevious' in candidate)) return null;
  return typeof candidate.hasPrevious === 'boolean'
    ? { hasPrevious: candidate.hasPrevious }
    : null;
}

export function markEntry(): void {
  if (appState(window.history.state)) return;
  const state = window.history.state;
  const previous = state && typeof state === 'object' ? state : {};
  window.history.replaceState({ ...previous, [HISTORY_KEY]: { hasPrevious: false } }, '');
}

export function hasInAppBack(): boolean {
  return appState(window.history.state)?.hasPrevious === true;
}

export function writeRoute(route: AppRoute, mode: 'push' | 'replace' = 'push'): void {
  const url = routeUrl(route, window.location);
  if (mode === 'replace') {
    const state = window.history.state;
    const existing = state && typeof state === 'object' ? state : {};
    window.history.replaceState({
      ...existing, [HISTORY_KEY]: { hasPrevious: appState(existing)?.hasPrevious ?? false },
    }, '', url);
  } else {
    window.history.pushState({ [HISTORY_KEY]: { hasPrevious: true } }, '', url);
  }
}
