import type { EncounterLocation } from '../storage/types';

export type LocationResult =
  | { status: 'saved'; location: EncounterLocation }
  | { status: 'unavailable'; reason: 'unsupported' | 'denied' | 'timeout' | 'error' };

export async function requestEncounterLocation(timeoutMs = 8_000): Promise<LocationResult> {
  if (!('geolocation' in navigator)) {
    return { status: 'unavailable', reason: 'unsupported' };
  }

  return new Promise<LocationResult>((resolve) => {
    let settled = false;
    const finish = (result: LocationResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };

    const timeout = window.setTimeout(
      () => finish({ status: 'unavailable', reason: 'timeout' }),
      timeoutMs,
    );

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          status: 'saved',
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp || Date.now(),
          },
        }),
      (error) =>
        finish({
          status: 'unavailable',
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'error',
        }),
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: timeoutMs,
      },
    );
  });
}
