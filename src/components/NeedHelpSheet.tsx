import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import CheckInService from '../services/CheckInService';
import LocationService from '../services/LocationService';
import { User } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../styles/theme';

const AUTO_SEND_SECONDS = 10;

interface NeedHelpSheetProps {
  visible: boolean;
  onClose: () => void;
  user: User;
}

const NeedHelpSheet: React.FC<NeedHelpSheetProps> = ({ visible, onClose, user }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_SEND_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (visible) {
      setCountdown(AUTO_SEND_SECONDS);
      intervalRef.current = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else {
      clearCountdown();
      const t = setTimeout(() => {
        setSent(false);
        setSending(false);
        setCountdown(AUTO_SEND_SECONDS);
      }, 300);
      return () => clearTimeout(t);
    }
    return clearCountdown;
  }, [visible]);

  useEffect(() => {
    if (countdown <= 0 && visible && !sending && !sent) {
      clearCountdown();
      handleSend();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  const handleSend = async () => {
    if (sending || sent || !user.familyGroupId) return;
    clearCountdown();
    setSending(true);
    try {
      const location = await LocationService.getCurrentPosition();
      await CheckInService.sendHelpAlert(
        user.uid,
        user.displayName ?? 'A family member',
        user.familyGroupId,
        location,
      );
      setSent(true);
      setTimeout(onClose, 1800);
    } catch {
      setSending(false);
    }
  };

  const handleCancel = () => {
    clearCountdown();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleCancel} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.warningCard}>
          <View style={styles.warningIconWrap}>
            <Icon name="warning" size={22} color="#fff" />
          </View>
          <View style={styles.warningTextCol}>
            <Text style={styles.warningTitle}>I need help</Text>
            <Text style={styles.warningSubtitle}>This will alert your family immediately</Text>
          </View>
        </View>

        <Text style={styles.desc}>
          Your location and status will be shared with all family members. They'll receive an urgent notification.
        </Text>

        {sent ? (
          <View style={styles.sentRow}>
            <Icon name="checkmark-circle" size={18} color={COLORS.accent.red} />
            <Text style={styles.sentText}>Alert sent to family</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.gradient.dangerStart, COLORS.gradient.dangerEnd]}
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>
                  Send alert to family{countdown < AUTO_SEND_SECONDS ? ` (${countdown}s)` : ''}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay.dark,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background.secondary,
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border.subtle,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border.strong,
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.large,
    backgroundColor: COLORS.background.primary,
    borderWidth: 1,
    borderColor: COLORS.accent.redDim,
    marginBottom: SPACING.md,
  },
  warningTextCol: {
    flex: 1,
  },
  warningIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.accent.red,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  warningTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  warningSubtitle: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 2,
  },
  desc: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  sendBtn: {
    paddingVertical: SPACING.lg - 2,
    borderRadius: RADIUS.large,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  sentText: {
    color: COLORS.accent.red,
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  cancelText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default NeedHelpSheet;
