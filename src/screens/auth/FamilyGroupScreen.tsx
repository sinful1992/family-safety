import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthenticationModule from '../../services/AuthenticationModule';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, COMMON_STYLES } from '../../styles/theme';

const ROLES = ['Mom', 'Dad', 'Son', 'Daughter', 'Grandparent', 'Other'];

const FamilyGroupScreen = () => {
  const { showAlert } = useAlert();
  const [groupName, setGroupName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showAlert('Error', 'Please enter a family group name', undefined, { icon: 'error' });
      return;
    }

    setLoading(true);
    try {
      const user = await AuthenticationModule.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      if (role) {
        await AuthenticationModule.updateUserRole(user.uid, role);
      }

      const result = await AuthenticationModule.createFamilyGroup(groupName.trim(), user.uid);
      await AuthenticationModule.refreshUserData();

      showAlert(
        'Group Created!',
        `Share this code with your family:\n\n${result.invitationCode}`,
        [{ text: 'Got it', style: 'default' }],
        { icon: 'success' },
      );
    } catch (error: unknown) {
      showAlert('Error', error instanceof Error ? error.message : 'Something went wrong.', undefined, { icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!invitationCode.trim()) {
      showAlert('Error', 'Please enter an invitation code', undefined, { icon: 'error' });
      return;
    }

    const normalizedCode = invitationCode.trim().toUpperCase().replace(/\s/g, '');
    if (normalizedCode.length !== 8) {
      showAlert('Error', 'Invitation codes must be exactly 8 characters', undefined, { icon: 'error' });
      return;
    }

    setLoading(true);
    try {
      const user = await AuthenticationModule.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      if (role) {
        await AuthenticationModule.updateUserRole(user.uid, role);
      }

      await AuthenticationModule.joinFamilyGroup(normalizedCode, user.uid);
      await AuthenticationModule.refreshUserData();

      showAlert('Joined!', 'You have joined the family group.', undefined, { icon: 'success' });
    } catch (error: unknown) {
      let msg = 'Something went wrong. Please try again.';
      if (error instanceof Error) {
        msg = error.message;
        if (msg.includes('Invalid invitation code')) msg = 'Invalid code. Please check and try again.';
        else if (msg.includes('no longer exists')) msg = 'This family group has been deleted.';
      }
      showAlert('Error', msg, undefined, { icon: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.iconRow}>
            <Icon name="people" size={32} color={COLORS.accent.green} />
          </View>
          <Text style={styles.title}>Family Group</Text>
          <Text style={styles.subtitle}>Create a new group or join your family</Text>

          {/* Mode toggle */}
          <View style={styles.toggle}>
            {(['create', 'join'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                  {m === 'create' ? 'Create' : 'Join'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role picker */}
          <Text style={styles.label}>Your role in the family</Text>
          <View style={styles.roleRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                onPress={() => setRole(r === role ? '' : r)}
              >
                <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === 'create' ? (
            <>
              <TextInput
                style={COMMON_STYLES.input}
                placeholder="Family group name (e.g., The Smiths)"
                placeholderTextColor={COLORS.text.dim}
                value={groupName}
                onChangeText={setGroupName}
                editable={!loading}
              />
              <TouchableOpacity onPress={handleCreateGroup} disabled={loading} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, loading && { opacity: 0.5 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Create Family Group</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={COMMON_STYLES.input}
                placeholder="Invitation code (e.g., A3F7K9M2)"
                placeholderTextColor={COLORS.text.dim}
                value={invitationCode}
                onChangeText={setInvitationCode}
                autoCapitalize="characters"
                maxLength={8}
                editable={!loading}
              />
              <TouchableOpacity onPress={handleJoinGroup} disabled={loading} activeOpacity={0.85}>
                <LinearGradient
                  colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, loading && { opacity: 0.5 }]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Join Family Group</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background.primary },
  scroll: { flexGrow: 1, padding: SPACING.xl, paddingTop: SPACING.xxxl },
  iconRow: { alignItems: 'center', marginBottom: SPACING.md },
  title: {
    fontSize: TYPOGRAPHY.fontSize.display,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  toggle: {
    flexDirection: 'row',
    marginBottom: SPACING.xxl,
    borderRadius: RADIUS.large,
    overflow: 'hidden',
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  toggleBtn: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.accent.greenSubtle,
    borderWidth: 0,
  },
  toggleText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  toggleTextActive: {
    color: COLORS.accent.green,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  button: {
    padding: 17,
    borderRadius: RADIUS.large,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default FamilyGroupScreen;
