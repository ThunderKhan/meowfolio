import { describe, expect, it } from 'vitest';
import { readRoute, routeUrl } from './routes';

describe('Meowfolio navigation routes', () => {
  it('restores Home and Cats from shareable URLs', () => {
    expect(readRoute({ pathname: '/', search: '' })).toEqual({ screen: 'home' });
    expect(readRoute({ pathname: '/', search: '?view=cats' })).toEqual({ screen: 'cats' });
  });

  it('restores individual cat details, including URL-encoded IDs', () => {
    const id = 'cat / #1';
    const url = routeUrl({ screen: 'cat', catId: id }, { search: '?skipWelcome=1', hash: '' });
    expect(readRoute(new URL(url, 'https://example.test'))).toEqual({ screen: 'cat', catId: id });
    expect(url).toContain('skipWelcome=1');
  });

  it('preserves studio deep links and existing query flags', () => {
    const url = routeUrl({ screen: 'studio', catId: 'cat 42' }, {
      search: '?mockAi=single&view=cats&cat=old',
      hash: '',
    });
    expect(url).toBe('/studio/cat%2042?mockAi=single');
    expect(readRoute(new URL(url, 'https://example.test'))).toEqual({
      screen: 'studio', catId: 'cat 42',
    });
  });

  it('does not carry a stale cat selection into Home or Cats', () => {
    expect(routeUrl({ screen: 'cats' }, {
      search: '?view=cat&cat=abc&skipWelcome=1', hash: '',
    })).toBe('/?skipWelcome=1&view=cats');
    expect(routeUrl({ screen: 'home' }, {
      search: '?view=cat&cat=abc&skipWelcome=1', hash: '',
    })).toBe('/?skipWelcome=1');
  });

  it('treats an invalid studio deep link as Home', () => {
    expect(readRoute({ pathname: '/studio/%broken', search: '' })).toEqual({ screen: 'home' });
  });
});
