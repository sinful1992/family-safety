import database from '@react-native-firebase/database';
import { v4 as uuidv4 } from 'uuid';
import supabase from './SupabaseClient';
import { Location, CheckInRecord } from '../types';

class CheckInService {
  async sendCheckInRequest(
    requesterId: string,
    requesterName: string,
    targetUserId: string,
    targetUserName: string,
    groupId: string,
  ): Promise<string> {
    const checkInId = uuidv4();
    const now = Date.now();

    const checkInRecord: CheckInRecord = {
      id: checkInId,
      groupId,
      requestedBy: requesterId,
      requestedByName: requesterName,
      targetUserId,
      targetUserName,
      requestedAt: now,
      response: null,
    };

    const updates: { [key: string]: any } = {};
    updates[`/checkIns/${checkInId}`] = checkInRecord;
    updates[`/familyGroups/${groupId}/memberStatus/${targetUserId}/checkIn`] = {
      status: 'pending',
      requestedBy: requesterId,
      requestedByName: requesterName,
      requestedAt: now,
    };

    await database().ref().update(updates);

    try {
      const { error } = await supabase.functions.invoke('send-checkin-request', {
        body: {
          check_in_id: checkInId,
          target_user_id: targetUserId,
          requester_name: requesterName,
          group_id: groupId,
        },
      });
      if (error) throw error;
    } catch (fcmError) {
      // Rollback pending status — target was never notified
      await database().ref(`/checkIns/${checkInId}`).remove().catch(() => {});
      await database().ref(`/familyGroups/${groupId}/memberStatus/${targetUserId}/checkIn`).remove().catch(() => {});
      throw new Error(`Failed to send ping: ${fcmError instanceof Error ? fcmError.message : String(fcmError)}`);
    }

    return checkInId;
  }

  async respondToCheckIn(
    checkInId: string,
    responderId: string,
    responderName: string,
    groupId: string,
    response: 'okay' | 'need_help',
    location: Location,
  ): Promise<void> {
    const now = Date.now();

    const updates: { [key: string]: any } = {};
    updates[`/checkIns/${checkInId}/response`] = response;
    updates[`/checkIns/${checkInId}/respondedAt`] = now;
    updates[`/checkIns/${checkInId}/location`] = location;
    updates[`/familyGroups/${groupId}/memberStatus/${responderId}/location`] = location;
    updates[`/familyGroups/${groupId}/memberStatus/${responderId}/checkIn/status`] = response;
    updates[`/familyGroups/${groupId}/memberStatus/${responderId}/checkIn/respondedAt`] = now;

    await database().ref().update(updates);

    // Notify requester (fire-and-forget)
    const checkInSnap = await database().ref(`/checkIns/${checkInId}`).once('value');
    const checkIn: CheckInRecord | null = checkInSnap.val();

    if (checkIn?.requestedBy) {
      supabase.functions
        .invoke('send-checkin-response', {
          body: {
            check_in_id: checkInId,
            requester_user_id: checkIn.requestedBy,
            responder_name: responderName,
            response,
            group_id: groupId,
          },
        })
        .catch(() => {});
    }
  }

  async shareLocationImmediate(userId: string, groupId: string, location: Location): Promise<void> {
    await database().ref(`/familyGroups/${groupId}/memberStatus/${userId}/location`).set(location);
  }

  async sendHelpAlert(
    userId: string,
    displayName: string,
    groupId: string,
    location: Location,
  ): Promise<void> {
    const now = Date.now();

    const updates: { [key: string]: any } = {};
    updates[`/familyGroups/${groupId}/memberStatus/${userId}/location`] = location;
    updates[`/familyGroups/${groupId}/memberStatus/${userId}/checkIn`] = {
      status: 'need_help',
      requestedBy: userId,
      requestedByName: displayName,
      requestedAt: now,
      respondedAt: now,
    };

    await database().ref().update(updates);

    supabase.functions
      .invoke('send-help-alert', {
        body: { sender_user_id: userId, sender_name: displayName, group_id: groupId },
      })
      .catch(() => {});
  }

  async getCheckIn(checkInId: string): Promise<CheckInRecord | null> {
    const snap = await database().ref(`/checkIns/${checkInId}`).once('value');
    return snap.val();
  }

  listenToCheckIn(checkInId: string, callback: (record: CheckInRecord | null) => void): () => void {
    const ref = database().ref(`/checkIns/${checkInId}`);
    const handler = (snap: any) => callback(snap.val());
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }
}

export default new CheckInService();
