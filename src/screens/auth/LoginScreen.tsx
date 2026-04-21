import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthenticationModule from '../../services/AuthenticationModule';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../styles/theme';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await AuthenticationModule.signInWithGoogle();
    } catch (error: unknown) {
      showAlert(
        'Sign In Failed',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        undefined,
        { icon: 'error' },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Icon name="shield-checkmark" size={40} color={COLORS.accent.green} />
          </View>
          <Text style={styles.title}>Family Safety</Text>
          <Text style={styles.subtitle}>Stay connected with your family</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, loading && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Icon name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>Continue with Google</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={() => navigation.navigate('EmailLogin' as never)}
            disabled={loading}
            activeOpacity={0.75}
          >
            <View style={styles.buttonContent}>
              <Icon name="mail-outline" size={20} color={COLORS.text.primary} style={{ marginRight: 10 }} />
              <Text style={styles.buttonSecondaryText}>Sign in with Email</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp' as never)}
            disabled={loading}
          >
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'space-between',
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent.greenSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.accent.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.display,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  actions: {
    gap: SPACING.md,
  },
  button: {
    padding: 17,
    borderRadius: RADIUS.large,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  buttonSecondary: {
    backgroundColor: COLORS.glass.subtle,
    padding: 17,
    borderRadius: RADIUS.large,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.medium,
  },
  buttonSecondaryText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  linkText: {
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.md,
    marginTop: SPACING.sm,
  },
  linkAccent: {
    color: COLORS.accent.green,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default LoginScreen;
