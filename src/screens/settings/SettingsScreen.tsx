import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { User } from '../../types';
import AuthenticationModule from '../../services/AuthenticationModule';
import NotificationManager from '../../services/NotificationManager';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const ROLES = ['Mom', 'Dad', 'Son', 'Daughter', 'Grandparent', 'Other'];

interface SettingsScreenProps {
  user: User;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user }) => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [signingOut, setSigningOut] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [currentRole, setCurrentRole] = useState(user.role ?? '');

  const handleRoleSelect = async (role: string) => {
    const newRole = role === currentRole ? '' : role;
    setCurrentRole(newRole);
    setSavingRole(true);
    try {
      await AuthenticationModule.updateUserRole(user.uid, newRole);
    } catch {
      setCurrentRole(currentRole); // revert
    } finally {
      setSavingRole(false);
    }
  };

  const handleSignOut = () => {
    showAlert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await NotificationManager.clearToken();
              await AuthenticationModule.signOut();
            } catch (error: unknown) {
              showAlert('Error', error instanceof Error ? error.message : 'Sign out failed', undefined, { icon: 'error' });
              setSigningOut(false);
            }
          },
        },
      ],
      { icon: 'warning' },
    );
  };

  const handleLeaveGroup = () => {
    if (!user.familyGroupId) return;
    showAlert(
      'Leave Family Group',
      'Are you sure? You will need a new invitation code to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthenticationModule.leaveFamilyGroup(user.uid, user.familyGroupId!);
            } catch (error: unknown) {
              showAlert('Error', error instanceof Error ? error.message : 'Failed to leave group', undefined, { icon: 'error' });
            }
          },
        },
      ],
      { icon: 'warning' },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.displayName ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName}>{user.displayName ?? '—'}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Role */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Your Role</Text>
            {savingRole && <ActivityIndicator size="small" color={COLORS.accent.green} />}
          </View>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, currentRole === r && styles.roleChipActive]}
                onPress={() => handleRoleSelect(r)}
              >
                <Text style={[styles.roleChipText, currentRole === r && styles.roleChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Family group */}
        {user.familyGroupId && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Family Group</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Icon name="key-outline" size={18} color={COLORS.text.tertiary} />
                <Text style={styles.infoLabel}>Group ID</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user.familyGroupId}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={handleLeaveGroup}>
              <Icon name="exit-outline" size={20} color={COLORS.accent.amber} />
              <Text style={[styles.actionText, { color: COLORS.accent.amber }]}>Leave Family Group</Text>
              <Icon name="chevron-forward" size={18} color={COLORS.text.dim} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.actionRow, signingOut && { opacity: 0.5 }]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={COLORS.accent.red} />
              ) : (
                <Icon name="log-out-outline" size={20} color={COLORS.accent.red} />
              )}
              <Text style={[styles.actionText, { color: COLORS.accent.red }]}>Sign Out</Text>
              {!signingOut && <Icon name="chevron-forward" size={18} color={COLORS.text.dim} />}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  scroll: { padding: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.xxl },
  section: { gap: SPACING.sm },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: COLORS.text.tertiary,
  },
  card: {
    backgroundColor: COLORS.glass.subtle,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent.greenSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.accent.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.accent.green,
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  profileName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  profileEmail: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  roleChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  roleChipActive: {
    backgroundColor: COLORS.accent.greenSubtle,
    borderColor: COLORS.accent.greenDim,
  },
  roleChipText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  roleChipTextActive: {
    color: COLORS.accent.green,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  infoLabel: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  infoValue: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    maxWidth: 160,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.subtle,
    marginHorizontal: SPACING.lg,
  },
});

export default SettingsScreen;
