import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AuthenticationModule from '../../services/AuthenticationModule';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, COMMON_STYLES } from '../../styles/theme';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      showAlert('Missing Fields', 'Please fill in all fields.', undefined, { icon: 'warning' });
      return;
    }
    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.', undefined, { icon: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await AuthenticationModule.signUp(email.trim(), password, name.trim());
    } catch (error: unknown) {
      showAlert(
        'Sign Up Failed',
        error instanceof Error ? error.message : 'Something went wrong.',
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join your family safety network</Text>

          <View style={styles.form}>
            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Full Name"
              placeholderTextColor={COLORS.text.dim}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Email"
              placeholderTextColor={COLORS.text.dim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor={COLORS.text.dim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, loading && { opacity: 0.5 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkAccent}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background.primary },
  scroll: { flexGrow: 1, padding: SPACING.xl },
  back: { marginBottom: SPACING.xxl },
  title: {
    fontSize: TYPOGRAPHY.fontSize.display,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xxxl,
  },
  form: { gap: SPACING.md },
  button: {
    padding: 17,
    borderRadius: RADIUS.large,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: '#fff',
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

export default SignUpScreen;
