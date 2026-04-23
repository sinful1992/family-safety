export type CheckInStatus = 'idle' | 'pending' | 'okay' | 'need_help' | 'timed_out';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  familyGroupId: string | null;
  role?: string;
  fcmToken?: string;
  createdAt: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  createdBy: string;
  memberIds: { [userId: string]: true };
  createdAt: number;
  invitationCode?: string;
}

export interface Location {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface CheckIn {
  status: CheckInStatus;
  requestedBy: string;
  requestedByName: string;
  requestedAt: number;
  respondedAt?: number;
  timedOutAt?: number;
}

export type LocationErrorReason =
  | 'permission_denied'
  | 'permission_blocked'
  | 'timeout'
  | 'unavailable'
  | 'unknown';

export interface LocationError {
  reason: LocationErrorReason;
  at: number;
}

export interface MemberStatus {
  uid: string;
  displayName: string | null;
  role?: string;
  photoURL?: string | null;
  location?: Location;
  checkIn?: CheckIn;
  lastLocationError?: LocationError;
}

export interface CheckInRecord {
  id: string;
  groupId: string;
  requestedBy: string;
  requestedByName: string;
  targetUserId: string;
  targetUserName: string;
  requestedAt: number;
  response: null | 'okay' | 'need_help';
  respondedAt?: number;
  location?: Location;
}

export type Unsubscribe = () => void;

export type UserCredential = {
  user: User;
  token: string;
};
