import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { MemberStatus, CheckInStatus } from '../types';
import StatusRing from './StatusRing';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../styles/theme';

const AVATAR_SIZE = 64;
const RING_SIZE = AVATAR_SIZE + 18;

const STATUS_LABEL: Record<CheckInStatus, string> = {
  okay: 'Okay',
  pending: 'Checking in...',
  need_help: 'Needs help',
  idle: 'Unknown',
};

const ROLE_EMOJI: Record<string, string> = {
  Mom: '👩',
  Dad: '👨',
  Son: '👦',
  Daughter: '👧',
  Grandparent: '👴',
  Other: '👤',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getCheckInStatus(member: MemberStatus): CheckInStatus {
  return (member.checkIn?.status as CheckInStatus) ?? 'idle';
}

interface BeaconCardProps {
  member: MemberStatus;
  onPress: () => void;
  isSelf?: boolean;
}

const BeaconCard: React.FC<BeaconCardProps> = ({ member, onPress, isSelf }) => {
  const status = getCheckInStatus(member);

  const statusColor =
    status === 'okay' ? COLORS.status.okay :
    status === 'pending' ? COLORS.status.pending :
    status === 'need_help' ? COLORS.status.needHelp :
    COLORS.status.unknown;

  const lastSeen = member.checkIn?.respondedAt
    ? formatDistanceToNow(member.checkIn.respondedAt, { addSuffix: true })
    : member.location?.timestamp
    ? formatDistanceToNow(member.location.timestamp, { addSuffix: true })
    : null;

  const roleEmoji = member.role ? (ROLE_EMOJI[member.role] ?? '👤') : '👤';

  return (
    <TouchableOpacity
      style={[styles.card, isSelf && styles.cardSelf]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Beacon ring + avatar */}
      <View style={styles.avatarContainer}>
        <StatusRing status={status} size={RING_SIZE} ringWidth={2.5} />
        <View style={[styles.avatar, { borderColor: statusColor }]}>
          <Text style={styles.avatarText}>{getInitials(member.displayName)}</Text>
        </View>
        <Text style={styles.roleEmoji}>{roleEmoji}</Text>
      </View>

      {/* Name + role */}
      <Text style={styles.name} numberOfLines={1}>
        {member.displayName ?? 'Unknown'}{isSelf ? ' (You)' : ''}
      </Text>
      {member.role && (
        <Text style={styles.role}>{member.role}</Text>
      )}

      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}50` }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABEL[status]}
        </Text>
      </View>

      {/* Last seen */}
      {lastSeen && (
        <Text style={styles.lastSeen}>{lastSeen}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.glass.subtle,
    borderRadius: RADIUS.xxlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },
  cardSelf: {
    borderColor: COLORS.border.medium,
    backgroundColor: COLORS.glass.medium,
  },
  avatarContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  roleEmoji: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    fontSize: 18,
  },
  name: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textAlign: 'center',
  },
  role: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    gap: 5,
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
  },
});

export default BeaconCard;
