import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import {
  GoogleSignin,
  isSuccessResponse,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_WEB_CLIENT_ID } from '@env';
import { User, UserCredential, FamilyGroup, Unsubscribe } from '../types';

class AuthenticationModule {
  private readonly AUTH_TOKEN_KEY = '@auth_token';
  private readonly USER_KEY = '@user';

  async signUp(email: string, password: string, displayName?: string): Promise<UserCredential> {
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const token = await userCredential.user.getIdToken();

      if (displayName) {
        await userCredential.user.updateProfile({ displayName });
      }

      const user: User = {
        uid: userCredential.user.uid,
        email: userCredential.user.email || email,
        displayName: displayName || userCredential.user.displayName,
        familyGroupId: null,
        createdAt: Date.now(),
      };

      await database().ref(`/users/${user.uid}`).set(user);
      await this.storeAuthData(user, token);

      return { user, token };
    } catch (error: unknown) {
      throw new Error(`Sign up failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await auth().signInWithEmailAndPassword(email, password);
      const token = await userCredential.user.getIdToken();
      const userSnapshot = await database().ref(`/users/${userCredential.user.uid}`).once('value');
      const user: User = userSnapshot.val();

      if (!user) throw new Error('User data not found');

      await this.storeAuthData(user, token);
      return { user, token };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (
        firebaseError.code === 'auth/invalid-credential' ||
        firebaseError.code === 'auth/wrong-password' ||
        firebaseError.code === 'auth/user-not-found'
      ) {
        throw new Error('Incorrect email or password. If you signed up with Google, use "Sign in with Google" instead.');
      }
      throw new Error(`Sign in failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private googleConfigured = false;

  private ensureGoogleConfigured(): void {
    if (!this.googleConfigured) {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
      this.googleConfigured = true;
    }
  }

  async signInWithGoogle(): Promise<UserCredential | null> {
    try {
      this.ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return null;
      if (!isSuccessResponse(response)) throw new Error('Google Sign-In failed');

      const idToken = response.data?.idToken;
      if (!idToken) throw new Error('Google Sign-In failed: no ID token returned');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const firebaseUserCredential = await auth().signInWithCredential(googleCredential);
      const firebaseUser = firebaseUserCredential.user;
      const token = await firebaseUser.getIdToken();

      const userSnapshot = await database().ref(`/users/${firebaseUser.uid}`).once('value');
      const existingUser: User | null = userSnapshot.val();

      if (existingUser) {
        await this.storeAuthData(existingUser, token);
        return { user: existingUser, token };
      }

      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email || null,
        photoURL: firebaseUser.photoURL,
        familyGroupId: null,
        createdAt: Date.now(),
      };

      await database().ref(`/users/${user.uid}`).set(user);
      await this.storeAuthData(user, token);
      return { user, token };
    } catch (error: unknown) {
      try { await GoogleSignin.signOut(); } catch (_) { /* ignore */ }

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            throw new Error('Google Sign-In is already in progress');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('Google Play Services is not available. Please update it.');
        }
      }

      const firebaseError = error as { code?: string };
      if (firebaseError.code === 'auth/account-exists-with-different-credential') {
        throw new Error('This email is already registered with a password. Use "Sign in with Email" instead.');
      }

      throw new Error(`Google Sign-In failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCurrentFirebaseUser(): Promise<FirebaseAuthTypes.User | null> {
    return auth().currentUser;
  }

  async signOut(): Promise<void> {
    try {
      try {
        this.ensureGoogleConfigured();
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
      } catch { /* not a Google user */ }

      await auth().signOut();
      await EncryptedStorage.removeItem(this.USER_KEY);
      await EncryptedStorage.removeItem(this.AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(this.USER_KEY).catch(() => {});
    } catch (error: unknown) {
      throw new Error(`Sign out failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserFamilyGroup(userId: string): Promise<FamilyGroup | null> {
    try {
      const userSnapshot = await database().ref(`/users/${userId}`).once('value');
      const user = userSnapshot.val();
      if (!user || !user.familyGroupId) return null;

      const groupSnapshot = await database().ref(`/familyGroups/${user.familyGroupId}`).once('value');
      return groupSnapshot.val();
    } catch (error: unknown) {
      throw new Error(`Failed to get family group: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createFamilyGroup(groupName: string, userId: string): Promise<{ group: FamilyGroup; invitationCode: string }> {
    try {
      const groupId = database().ref().push().key;
      if (!groupId) throw new Error('Failed to generate group ID');

      const invitationCode = this.generateInvitationCode();
      const timestamp = Date.now();

      const familyGroup: FamilyGroup = {
        id: groupId,
        name: groupName,
        createdBy: userId,
        memberIds: { [userId]: true },
        createdAt: timestamp,
      };

      const updates: { [key: string]: any } = {};
      updates[`/familyGroups/${groupId}`] = familyGroup;
      updates[`/invitations/${invitationCode}`] = { groupId, createdAt: timestamp };
      updates[`/users/${userId}/familyGroupId`] = groupId;

      await database().ref().update(updates);

      const userSnapshot = await database().ref(`/users/${userId}`).once('value');
      const updatedUser = userSnapshot.val();
      if (updatedUser) {
        await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      }

      return { group: familyGroup, invitationCode };
    } catch (error: unknown) {
      throw new Error(`Failed to create family group: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async joinFamilyGroup(invitationCode: string, userId: string): Promise<FamilyGroup> {
    try {
      const invitationSnapshot = await database().ref(`/invitations/${invitationCode}`).once('value');
      if (!invitationSnapshot.exists()) throw new Error('Invalid invitation code');

      const groupId = invitationSnapshot.val().groupId;

      const updates: { [key: string]: any } = {};
      updates[`/familyGroups/${groupId}/memberIds/${userId}`] = true;
      updates[`/users/${userId}/familyGroupId`] = groupId;
      await database().ref().update(updates);

      const groupSnapshot = await database().ref(`/familyGroups/${groupId}`).once('value');
      if (!groupSnapshot.exists()) {
        await database().ref(`/familyGroups/${groupId}/memberIds/${userId}`).remove();
        await database().ref(`/users/${userId}/familyGroupId`).remove();
        throw new Error('Family group no longer exists');
      }

      const familyGroup: FamilyGroup = groupSnapshot.val();

      const userSnapshot = await database().ref(`/users/${userId}`).once('value');
      const updatedUser = userSnapshot.val();
      if (updatedUser) {
        await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
      }

      return familyGroup;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: string }).code : '';

      if (msg.includes('Invalid invitation code')) throw new Error('Invalid invitation code. Please check and try again.');
      if (msg.includes('no longer exists')) throw new Error('This family group has been deleted.');
      if (code === 'PERMISSION_DENIED') throw new Error('Permission denied. Please contact support.');
      throw new Error(`Failed to join family group: ${msg}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return null;

      const userSnapshot = await database().ref(`/users/${currentUser.uid}`).once('value');
      const userData = userSnapshot.val();

      if (userData) {
        await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(userData));
      }
      return userData;
    } catch {
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      const token = await EncryptedStorage.getItem(this.AUTH_TOKEN_KEY);
      if (token) return token;

      const oldToken = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
      if (oldToken) {
        await EncryptedStorage.setItem(this.AUTH_TOKEN_KEY, oldToken);
        await AsyncStorage.removeItem(this.AUTH_TOKEN_KEY);
        return oldToken;
      }

      const currentUser = auth().currentUser;
      if (currentUser) {
        const freshToken = await currentUser.getIdToken();
        await EncryptedStorage.setItem(this.AUTH_TOKEN_KEY, freshToken);
        return freshToken;
      }

      return null;
    } catch {
      return null;
    }
  }

  onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    let userDataUnsubscribe: (() => void) | null = null;
    let lastProcessedUid: string | null = null;

    const authUnsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.uid === lastProcessedUid) return;
      lastProcessedUid = firebaseUser?.uid ?? null;

      if (userDataUnsubscribe) {
        userDataUnsubscribe();
        userDataUnsubscribe = null;
      }

      if (firebaseUser) {
        const userRef = database().ref(`/users/${firebaseUser.uid}`);
        const onUserDataChanged = (snapshot: any) => {
          const userData = snapshot.val();
          if (userData) {
            EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(userData));
            callback(userData);
          }
        };
        userRef.on('value', onUserDataChanged);
        userDataUnsubscribe = () => userRef.off('value', onUserDataChanged);
      } else {
        callback(null);
      }
    });

    return () => {
      authUnsubscribe();
      if (userDataUnsubscribe) userDataUnsubscribe();
    };
  }

  async refreshUserData(): Promise<User | null> {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return null;

      const userSnapshot = await database().ref(`/users/${currentUser.uid}`).once('value');
      const user: User = userSnapshot.val();
      if (user) {
        await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
      return user;
    } catch (error: unknown) {
      throw new Error(`Failed to refresh user data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await database().ref(`/users/${userId}/role`).set(role);
    const userSnapshot = await database().ref(`/users/${userId}`).once('value');
    const userData = userSnapshot.val();
    if (userData) {
      await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    }
  }

  async leaveFamilyGroup(userId: string, familyGroupId: string): Promise<void> {
    const updates: { [key: string]: any } = {};
    updates[`/familyGroups/${familyGroupId}/memberIds/${userId}`] = null;
    updates[`/users/${userId}/familyGroupId`] = null;
    updates[`/familyGroups/${familyGroupId}/memberStatus/${userId}`] = null;
    await database().ref().update(updates);

    const userSnapshot = await database().ref(`/users/${userId}`).once('value');
    const userData = userSnapshot.val();
    if (userData) {
      await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    }
  }

  private generateInvitationCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  private async storeAuthData(user: User, token: string): Promise<void> {
    await EncryptedStorage.setItem(this.USER_KEY, JSON.stringify(user));
    await EncryptedStorage.setItem(this.AUTH_TOKEN_KEY, token);
  }
}

export default new AuthenticationModule();
