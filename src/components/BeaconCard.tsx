import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { MemberStatus, CheckInStatus } from '../types';
import StatusRing from './StatusRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';
import { deriveDisplayStatus, usePendingTimeout } from '../utils/checkInStatus';

const AVATAR_SIZE = 42;
const RING_SIZE = AVATAR_SIZE + 14;

const STATUS_LABEL: Record<CheckInStatus, string> = {
  okay:      'Okay',
  pending:   'Pinging…',
  need_help: 'Needs help',
  idle:      'Unknown',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

interface BeaconCardProps {
  member: MemberStatus;
  onPress: () => void;
  isSelf?: boolean;
}

const BeaconCard: React.FC<BeaconCardProps> = ({ member, onPress, isSelf }) => {
  const now = usePendingTimeout(member.checkIn);
  const { status, timedOut } = deriveDisplayStatus(member.checkIn, now);
  const statusLabel = timedOut ? 'No response' : STATUS_LABEL[status];

  const color =
    status === 'okay'      ? COLORS.status.okay :
    status === 'pending'   ? COLORS.status.pending :
    status === 'need_help' ? COLORS.status.needHelp :
    COLORS.status.unknown;

  const lastSeen = member.checkIn?.respondedAt
    ? formatDistanceToNow(member.checkIn.respondedAt, { addSuffix: true })
    : member.location?.timestamp
    ? formatDistanceToNow(member.location.timestamp, { addSuffix: true })
    : null;

  const firstName = member.displayName?.split(' ')[0] ?? 'Unknown';

  return (
    <TouchableOpacity
      style={[styles.card, isSelf && styles.cardSelf]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Status strip across top */}
      <View style={[styles.strip, { backgroundColor: color }, status === 'idle' && styles.stripHidden]} />

      {/* Avatar + name/role row */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <StatusRing status={status} size={RING_SIZE} ringWidth={2} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(member.displayName)}</Text>
          </View>
        </View>

        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
            {isSelf && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>You</Text>
              </View>
            )}
          </View>
          {member.role && <Text style={styles.role}>{member.role}</Text>}
        </View>
      </View>

      {/* Status pill + last seen */}
      <View style={styles.bottomRow}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{statusLabel}</Text>
        </View>
        {lastSeen && <Text style={styles.lastSeen}>{lastSeen}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    padding: SPACING.md,
    paddingTop: SPACING.md + 2,
    gap: SPACING.sm + 2,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  cardSelf: {
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.secondary,
  },
  strip: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: -0.3,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
    flexWrap: 'nowrap',
  },
  name: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md - 0.5,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.small,
    backgroundColor: COLORS.glass.medium,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    flexShrink: 0,
  },
  youText: {
    color: COLORS.text.tertiary,
    fontSize: 9.5,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  role: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: COLORS.border.subtle,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  lastSeen: {
    color: COLORS.text.dim,
    fontSize: TYPOGRAPHY.fontSize.xs,
    flexShrink: 1,
  },
  stripHidden: {
    opacity: 0,
  },
});

export default BeaconCard;
