import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MemberStatus, CheckInStatus } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../styles/theme';
import { deriveDisplayStatus, PENDING_TIMEOUT_MS } from '../utils/checkInStatus';

function useNowForPendingMembers(members: MemberStatus[]): number {
  const [now, setNow] = useState(Date.now());

  const earliestExpiry = members.reduce<number | null>((acc, m) => {
    const ci = m.checkIn;
    if (!ci || ci.status !== 'pending' || !ci.requestedAt) return acc;
    const expiry = ci.requestedAt + PENDING_TIMEOUT_MS;
    return acc === null || expiry < acc ? expiry : acc;
  }, null);

  useEffect(() => {
    if (earliestExpiry === null) return;
    const remaining = earliestExpiry - Date.now();
    if (remaining <= 0) {
      setNow(Date.now());
      return;
    }
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [earliestExpiry]);

  return now;
}

function statusColor(s: CheckInStatus): string {
  switch (s) {
    case 'okay':      return COLORS.status.okay;
    case 'pending':   return COLORS.status.pending;
    case 'need_help': return COLORS.status.needHelp;
    default:          return COLORS.status.unknown;
  }
}

interface FamilyPulseProps {
  members: MemberStatus[];
  pinging: boolean;
  onPingAll: () => void;
  onNeedHelp: () => void;
}

const FamilyPulse: React.FC<FamilyPulseProps> = ({ members, pinging, onPingAll, onNeedHelp }) => {
  const now = useNowForPendingMembers(members);

  const counts = members.reduce<Record<CheckInStatus, number>>(
    (acc, m) => {
      const { status } = deriveDisplayStatus(m.checkIn, now);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { okay: 0, pending: 0, need_help: 0, idle: 0, timed_out: 0 },
  );

  const { okay, pending, need_help: need, idle } = counts;

  const tone: CheckInStatus =
    need > 0 ? 'need_help' :
    pending > 0 ? 'pending' :
    idle === members.length ? 'idle' :
    'okay';

  const toneColor = statusColor(tone);

  const headline =
    need > 0 ? `${need} need${need > 1 ? 's' : ''} attention` :
    pending > 0 ? `Pinging ${pending}…` :
    okay > 0 ? `All ${okay} okay` :
    'Waiting for check-ins';

  return (
    <View style={styles.container}>
      <View style={[styles.strip, { backgroundColor: toneColor }, tone === 'idle' && styles.stripHidden]} />

      <View style={styles.headlineRow}>
        <View style={[styles.dot, { backgroundColor: toneColor }]} />
        <View style={styles.headlineText}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.sub}>
            {okay} okay · {pending} pinging · {need} need help · {idle} unknown
          </Text>
        </View>
      </View>

      <View style={styles.btns}>
        <TouchableOpacity
          style={[styles.btn, styles.btnGreen, pinging && styles.btnDisabled]}
          onPress={onPingAll}
          disabled={pinging}
          activeOpacity={0.8}
        >
          <Icon name="radio-outline" size={13} color={COLORS.status.okay} />
          <Text style={[styles.btnText, { color: COLORS.status.okay }]}>
            {pinging ? 'Pinging…' : 'Ping all'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnRed]}
          onPress={onNeedHelp}
          activeOpacity={0.8}
        >
          <Icon name="warning-outline" size={13} color={COLORS.status.needHelp} />
          <Text style={[styles.btnText, styles.btnTextUrgent, { color: COLORS.status.needHelp }]}>
            I need help
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xlarge,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
    padding: SPACING.md,
    paddingTop: SPACING.md + 4,
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 1.5,
    borderRadius: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md - 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  headline: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.lg - 0.5,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.2,
  },
  sub: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
    marginTop: 1,
  },
  btns: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: SPACING.sm + 1,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
  },
  btnGreen: {
    backgroundColor: COLORS.accent.greenSubtle,
    borderColor: COLORS.accent.greenDim,
  },
  btnRed: {
    backgroundColor: COLORS.accent.redSubtle,
    borderColor: COLORS.accent.redDim,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: TYPOGRAPHY.fontSize.sm + 0.5,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  btnTextUrgent: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stripHidden: {
    opacity: 0,
  },
  headlineText: {
    flex: 1,
  },
});

export default FamilyPulse;
