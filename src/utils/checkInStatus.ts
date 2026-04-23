import { useEffect, useState } from 'react';
import { CheckIn, CheckInStatus } from '../types';

export const PENDING_TIMEOUT_MS = 30_000;

export function isPendingTimedOut(checkIn: CheckIn | undefined, now: number): boolean {
  if (!checkIn || checkIn.status !== 'pending' || !checkIn.requestedAt) return false;
  return now - checkIn.requestedAt > PENDING_TIMEOUT_MS;
}

export function deriveDisplayStatus(
  checkIn: CheckIn | undefined,
  now: number,
): { status: CheckInStatus; timedOut: boolean } {
  const rawStatus = (checkIn?.status as CheckInStatus) ?? 'idle';
  const timedOut = rawStatus === 'timed_out' || isPendingTimedOut(checkIn, now);
  return { status: timedOut ? 'idle' : rawStatus, timedOut };
}

export function usePendingTimeout(checkIn: CheckIn | undefined): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!checkIn || checkIn.status !== 'pending' || !checkIn.requestedAt) return;
    const remaining = checkIn.requestedAt + PENDING_TIMEOUT_MS - Date.now();
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [checkIn?.status, checkIn?.requestedAt]);
  return now;
}
