import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import database from '@react-native-firebase/database';
import { MemberStatus, User, CheckInStatus, Location, CheckIn } from '../../types';
import CheckInService from '../../services/CheckInService';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';

const STATUS_COLOR: Record<CheckInStatus, string> = {
  okay: COLORS.status.okay,
  pending: COLORS.status.pending,
  need_help: COLORS.status.needHelp,
  idle: COLORS.status.unknown,
};

const STATUS_LABEL: Record<CheckInStatus, string> = {
  okay: 'Okay',
  pending: 'Check-in sent...',
  need_help: 'Needs Help',
  idle: 'Status unknown',
};

function openInMaps(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://maps.google.com/maps?q=${lat},${lng}`);
  });
}

function formatCoord(value: number, posLabel: string, negLabel: string): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(3);
  return `${deg}° ${min}' ${value >= 0 ? posLabel : negLabel}`;
}

const MemberDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member, currentUser } = route.params as { member: MemberStatus; currentUser: User };
  const { showAlert } = useAlert();

  const [liveStatus, setLiveStatus] = useState<{ location?: Location; checkIn?: CheckIn }>({
    location: member.location,
    checkIn: member.checkIn,
  });
  const [repinging, setRepinging] = useState(false);
  const hasPingedRef = useRef(false);

  const isSelf = member.uid === currentUser.uid;
  const status = (liveStatus.checkIn?.status as CheckInStatus) ?? 'idle';
  const statusColor = STATUS_COLOR[status];
  const hasLocation = !!(liveStatus.location?.lat && liveStatus.location?.lng);

  const respondedAt = liveStatus.checkIn?.respondedAt;
  const locationTimestamp = liveStatus.location?.timestamp;
  const lastSeenText = respondedAt
    ? formatDistanceToNow(respondedAt, { addSuffix: true })
    : locationTimestamp
    ? formatDistanceToNow(locationTimestamp, { addSuffix: true })
    : null;

  // Live location/status subscription
  useEffect(() => {
    const groupId = currentUser.familyGroupId!;
    const ref = database().ref(`/familyGroups/${groupId}/memberStatus/${member.uid}`);
    const handler = (snap: any) => {
      const val = snap.val();
      if (val) setLiveStatus({ location: val.location, checkIn: val.checkIn });
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }, []);

  // Auto-ping on open
  useEffect(() => {
    if (isSelf || hasPingedRef.current || status === 'pending') return;
    hasPingedRef.current = true;
    CheckInService.sendCheckInRequest(
      currentUser.uid,
      currentUser.displayName ?? 'Someone',
      member.uid,
      member.displayName ?? 'your family member',
      currentUser.familyGroupId!,
    ).catch(() => {});
  }, []);

  const handleReping = async () => {
    setRepinging(true);
    try {
      await CheckInService.sendCheckInRequest(
        currentUser.uid,
        currentUser.displayName ?? 'Someone',
        member.uid,
        member.displayName ?? 'your family member',
        currentUser.familyGroupId!,
      );
    } catch (error: unknown) {
      showAlert(
        'Failed to send',
        error instanceof Error ? error.message : 'Something went wrong.',
        undefined,
        { icon: 'error' },
      );
    } finally {
      setRepinging(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>
          {member.displayName ?? 'Family Member'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Status badge */}
        <View style={[styles.statusRow, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{STATUS_LABEL[status]}</Text>
          {lastSeenText && <Text style={styles.lastSeen}>{lastSeenText}</Text>}
        </View>

        {/* Location card */}
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Icon name="location" size={18} color={COLORS.accent.green} />
            <Text style={styles.locationTitle}>Last Known Location</Text>
          </View>

          {hasLocation ? (
            <>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>
                  {formatCoord(liveStatus.location!.lat, 'N', 'S')}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>
                  {formatCoord(liveStatus.location!.lng, 'E', 'W')}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Accuracy</Text>
                <Text style={styles.coordValue}>±{Math.round(liveStatus.location!.accuracy)}m</Text>
              </View>
              <View style={styles.divider} />
              {locationTimestamp && (
                <>
                  <View style={styles.coordRow}>
                    <Text style={styles.coordLabel}>Captured</Text>
                    <Text style={styles.coordValue}>
                      {formatDistanceToNow(locationTimestamp, { addSuffix: true })}
                    </Text>
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              <TouchableOpacity
                style={styles.openMapsBtn}
                onPress={() => openInMaps(
                  liveStatus.location!.lat,
                  liveStatus.location!.lng,
                  member.displayName ?? 'Family Member',
                )}
                activeOpacity={0.75}
              >
                <Icon name="map-outline" size={18} color={COLORS.accent.green} />
                <Text style={styles.openMapsBtnText}>Open in Maps</Text>
                <Icon name="open-outline" size={14} color={COLORS.accent.greenDim} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noLocation}>
              <Icon name="location-outline" size={36} color={COLORS.text.dim} />
              <Text style={styles.noLocationText}>
                {status === 'pending'
                  ? 'Waiting for their device to respond...'
                  : 'Location will appear once they receive a check-in'}
              </Text>
            </View>
          )}
        </View>

        {/* Member info */}
        <View style={styles.infoCard}>
          {member.role && (
            <View style={styles.infoRow}>
              <Icon name="heart-outline" size={18} color={COLORS.text.tertiary} />
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{member.role}</Text>
            </View>
          )}
        </View>

        {/* Re-ping button — only shown when not pending and not self */}
        {!isSelf && status !== 'pending' && (
          <TouchableOpacity
            onPress={handleReping}
            disabled={repinging}
            activeOpacity={0.85}
            style={repinging ? { opacity: 0.6 } : undefined}
          >
            <LinearGradient
              colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pingButton}
            >
              {repinging ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="radio-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={styles.pingButtonText}>
                    {status === 'okay' || status === 'need_help' ? 'Ping again' : 'Ping — Are you okay?'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  headerName: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  scroll: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
  },
  lastSeen: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  locationCard: {
    backgroundColor: COLORS.glass.subtle,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  locationTitle: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  coordLabel: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  coordValue: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border.subtle,
    marginHorizontal: SPACING.lg,
  },
  openMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.accent.greenSubtle,
    borderWidth: 1,
    borderColor: COLORS.accent.greenDim,
  },
  openMapsBtnText: {
    color: COLORS.accent.green,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
  },
  noLocation: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.md,
  },
  noLocationText: {
    color: COLORS.text.dim,
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: COLORS.glass.subtle,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  infoLabel: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  infoValue: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  pingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 17,
    borderRadius: RADIUS.large,
  },
  pingButtonText: {
    color: '#fff',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default MemberDetailScreen;
