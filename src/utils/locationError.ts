import database from '@react-native-firebase/database';
import { LocationError, LocationErrorReason } from '../types';

export function classifyLocationError(err: any): LocationErrorReason {
  if (!err) return 'unknown';
  if (typeof err.code === 'number') {
    if (err.code === 1) return 'permission_denied';
    if (err.code === 3) return 'timeout';
    if (err.code === 2 || err.code === 4 || err.code === 5) return 'unavailable';
  }
  const msg = String(err.message ?? err).toLowerCase();
  if (msg.includes('blocked')) return 'permission_blocked';
  if (msg.includes('denied')) return 'permission_denied';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('unavailable')) return 'unavailable';
  return 'unknown';
}

export async function writeLocationError(
  familyGroupId: string,
  userId: string,
  reason: LocationErrorReason,
): Promise<void> {
  try {
    const error: LocationError = { reason, at: Date.now() };
    await database()
      .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/lastLocationError`)
      .set(error);
  } catch {
    // Best-effort; sender still sees stale location state.
  }
}

export async function clearLocationError(
  familyGroupId: string,
  userId: string,
): Promise<void> {
  try {
    await database()
      .ref(`/familyGroups/${familyGroupId}/memberStatus/${userId}/lastLocationError`)
      .remove();
  } catch { }
}

export function describeLocationError(reason: LocationErrorReason): string {
  switch (reason) {
    case 'permission_denied':  return 'Location permission denied';
    case 'permission_blocked': return 'Location blocked in Settings';
    case 'timeout':            return 'GPS signal timed out';
    case 'unavailable':        return 'GPS unavailable';
    default:                   return 'Could not get location';
  }
}
