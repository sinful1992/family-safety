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

const EmailLoginScreen = () => {
  const navigation = useNavigation();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      showAlert('Missing Fields', 'Please enter your email and password.', undefined, { icon: 'warning' });
      return;
    }
    setLoading(true);
    try {
      await AuthenticationModule.signIn(email.trim(), password);
    } catch (error: unknown) {
      showAlert(
        'Sign In Failed',
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

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
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
            <View style={styles.passwordContainer}>
              <TextInput
                style={[COMMON_STYLES.input, { flex: 1, paddingRight: 50 }]}
                placeholder="Password"
                placeholderTextColor={COLORS.text.dim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSignIn} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, loading && { opacity: 0.5 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </LinearGradient>
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
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: 14, padding: 4 },
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
});

export default EmailLoginScreen;
