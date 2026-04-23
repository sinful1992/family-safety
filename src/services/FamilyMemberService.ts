import database from '@react-native-firebase/database';
import { User, MemberStatus, Unsubscribe } from '../types';

class FamilyMemberService {
  private listeners: Map<string, () => void> = new Map();

  listenToGroupMembers(
    groupId: string,
    callback: (members: MemberStatus[]) => void,
  ): Unsubscribe {
    const members: Map<string, MemberStatus> = new Map();
    const memberListeners: Map<string, () => void> = new Map();

    const groupMembersRef = database().ref(`/familyGroups/${groupId}/memberIds`);

    const onMembersChanged = (snapshot: any) => {
      const memberIds: { [uid: string]: true } = snapshot.val() || {};

      // Remove listeners for members who left
      for (const [uid, cleanup] of memberListeners) {
        if (!memberIds[uid]) {
          cleanup();
          memberListeners.delete(uid);
          members.delete(uid);
        }
      }

      // Add listeners for new members
      for (const uid of Object.keys(memberIds)) {
        if (memberListeners.has(uid)) continue;

        const userRef = database().ref(`/users/${uid}`);
        const statusRef = database().ref(`/familyGroups/${groupId}/memberStatus/${uid}`);

        let userData: Partial<MemberStatus> = {};
        let statusData: Partial<MemberStatus> = {};

        const emitUpdate = () => {
          const combined: MemberStatus = {
            uid,
            displayName: userData.displayName ?? null,
            role: userData.role,
            photoURL: userData.photoURL,
            location: statusData.location,
            checkIn: statusData.checkIn,
            lastLocationError: statusData.lastLocationError,
          };
          members.set(uid, combined);
          callback(Array.from(members.values()));
        };

        const onUser = (snap: any) => {
          const val: User | null = snap.val();
          if (val) {
            userData = {
              displayName: val.displayName,
              role: val.role,
              photoURL: val.photoURL,
            };
            emitUpdate();
          }
        };

        const onStatus = (snap: any) => {
          const val = snap.val();
          statusData = val
            ? { location: val.location, checkIn: val.checkIn, lastLocationError: val.lastLocationError }
            : {};
          emitUpdate();
        };

        userRef.on('value', onUser);
        statusRef.on('value', onStatus);

        memberListeners.set(uid, () => {
          userRef.off('value', onUser);
          statusRef.off('value', onStatus);
        });
      }
    };

    groupMembersRef.on('value', onMembersChanged);
    this.listeners.set(groupId, () => {
      groupMembersRef.off('value', onMembersChanged);
      for (const cleanup of memberListeners.values()) cleanup();
    });

    return () => {
      const cleanup = this.listeners.get(groupId);
      if (cleanup) {
        cleanup();
        this.listeners.delete(groupId);
      }
    };
  }

  stopAll(): void {
    for (const cleanup of this.listeners.values()) cleanup();
    this.listeners.clear();
  }
}

export default new FamilyMemberService();
