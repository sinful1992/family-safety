import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import CheckInService from '../../services/CheckInService';
import LocationService from '../../services/LocationService';
import { useAlert } from '../../contexts/AlertContext';
import { CheckInRecord, User } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

interface CheckInResponseScreenProps {
  user: User;
}

const CheckInResponseScreen: React.FC<CheckInResponseScreenProps> = ({ user }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { checkInId, groupId } = route.params as { checkInId: string; groupId: string };
  const { showAlert } = useAlert();

  const [checkIn, setCheckIn] = useState<CheckInRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<'okay' | 'need_help' | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    LocationService.getCurrentPosition()
      .then(loc => CheckInService.shareLocationImmediate(user.uid, groupId, loc))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = CheckInService.listenToCheckIn(checkInId, record => {
      setCheckIn(record);
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
    return unsubscribe;
  }, [checkInId, fadeAnim]);

  const handleRespond = async (response: 'okay' | 'need_help') => {
    setResponding(response);
    try {
      const location = await LocationService.getCurrentPosition();
      await CheckInService.respondToCheckIn(
        checkInId,
        user.uid,
        user.displayName ?? 'A family member',
        groupId,
        response,
        location,
      );

      showAlert(
        response === 'okay' ? 'Response sent!' : 'Help is on the way',
        response === 'okay'
          ? 'Your family knows you\'re okay.'
          : 'Your family has been notified that you need help.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
        { icon: response === 'okay' ? 'success' : 'warning' },
      );
    } catch (error: unknown) {
      showAlert(
        'Could not send response',
        error instanceof Error ? error.message : 'Please check your location settings.',
        undefined,
        { icon: 'error' },
      );
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!checkIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={48} color={COLORS.text.dim} />
          <Text style={styles.errorText}>Check-in not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Already responded
  if (checkIn.response) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Icon
            name={checkIn.response === 'okay' ? 'checkmark-circle' : 'warning'}
            size={64}
            color={checkIn.response === 'okay' ? COLORS.accent.green : COLORS.accent.red}
          />
          <Text style={styles.respondedTitle}>
            {checkIn.response === 'okay' ? 'You responded: Okay' : 'You responded: Need Help'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconRing}>
            <Icon name="radio-outline" size={40} color={COLORS.accent.green} />
          </View>
        </View>

        {/* Message */}
        <View style={styles.messageCard}>
          <Text style={styles.fromLabel}>Check-in from</Text>
          <Text style={styles.fromName}>{checkIn.requestedByName}</Text>
          <Text style={styles.question}>Are you okay?</Text>
          <Text style={styles.subtext}>
            Your location has been shared automatically.
          </Text>
        </View>

        {/* Response buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={() => handleRespond('okay')}
            disabled={!!responding}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <LinearGradient
              colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
              style={[styles.responseBtn, responding && { opacity: 0.5 }]}
            >
              {responding === 'okay' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="checkmark-circle-outline" size={26} color="#fff" />
                  <Text style={styles.responseBtnText}>I'm Okay</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleRespond('need_help')}
            disabled={!!responding}
            activeOpacity={0.85}
            style={{ flex: 1 }}
          >
            <View style={[styles.responseBtn, styles.responseBtnDanger, responding && { opacity: 0.5 }]}>
              {responding === 'need_help' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="warning-outline" size={26} color="#fff" />
                  <Text style={styles.responseBtnText}>Need Help</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background.primary },
  container: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    padding: SPACING.xl,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accent.greenSubtle,
    borderWidth: 2,
    borderColor: COLORS.accent.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageCard: {
    backgroundColor: COLORS.glass.elevated,
    borderRadius: RADIUS.modal,
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  fromLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  fromName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  question: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  subtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  responseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: 18,
    borderRadius: RADIUS.large,
    ...SHADOWS.green,
  },
  responseBtnDanger: {
    backgroundColor: COLORS.accent.red,
    shadowColor: COLORS.accent.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  responseBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  dismissBtn: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  dismissText: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  errorText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  respondedTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  linkText: {
    color: COLORS.accent.green,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});

export default CheckInResponseScreen;
