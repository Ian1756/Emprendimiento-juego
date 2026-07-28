/**
 * Rate limiting en memoria — INSTRUCCIONES.md §4.3.
 * Suficiente para una activación en un solo proceso. Si el despliegue escala a
 * varias instancias, sustituir por un contador compartido (Redis/Upstash) sin
 * cambiar esta interfaz.
 */
import 'server-only';

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function evictIfTooLarge(nowMs: number): void {
  if (windows.size < MAX_TRACKED_KEYS) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= nowMs) windows.delete(key);
  }
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  evictIfTooLarge(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP del cliente detrás del proxy del hosting. Solo para limitar, nunca se guarda. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || request.headers.get('x-real-ip') || 'desconocido';
}
