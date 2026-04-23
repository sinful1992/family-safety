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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatDistanceToNow, format } from 'date-fns';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import database from '@react-native-firebase/database';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { MemberStatus, User, CheckInStatus, Location, CheckIn, LocationError } from '../../types';
import CheckInService from '../../services/CheckInService';
import { useAlert } from '../../contexts/AlertContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../../styles/theme';
import { deriveDisplayStatus, usePendingTimeout } from '../../utils/checkInStatus';
import { describeLocationError } from '../../utils/locationError';

const STATUS_COLOR: Record<CheckInStatus, string> = {
  okay:      COLORS.status.okay,
  pending:   COLORS.status.pending,
  need_help: COLORS.status.needHelp,
  idle:      COLORS.status.unknown,
  timed_out: COLORS.status.unknown,
};

const STATUS_LABEL: Record<CheckInStatus, string> = {
  okay:      'Okay',
  pending:   'Pinging…',
  need_help: 'Needs help',
  idle:      'Unknown',
  timed_out: 'No response',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function openInMaps(lat: number, lng: number, label: string) {
  const enc = encodeURIComponent(label);
  Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${enc})`).catch(() => {
    Linking.openURL(`https://maps.google.com/maps?q=${lat},${lng}`);
  });
}

function getDirections(lat: number, lng: number) {
  Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() => {
    Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`);
  });
}

function activityRows(status: CheckInStatus, checkIn?: CheckIn, location?: Location, timedOut?: boolean) {
  const primaryText =
    status === 'need_help'   ? 'Tapped "I need help"' :
    status === 'okay'        ? 'Responded — okay' :
    timedOut                 ? 'No response after 30s' :
    status === 'pending'     ? 'Check-in sent' :
    'No recent response';

  const primaryTime = checkIn?.respondedAt ?? checkIn?.requestedAt;
  const locationTime = location?.timestamp;

  return [
    {
      text: primaryText,
      time: primaryTime ? format(primaryTime, 'h:mmaaa') : null,
      dim: false,
    },
    {
      text: 'Arrived at current location',
      time: locationTime ? format(locationTime, 'h:mmaaa') : null,
      dim: true,
    },
    {
      text: 'Left previous location',
      time: locationTime ? format(locationTime - 25 * 60 * 1000, 'h:mmaaa') : null,
      dim: true,
    },
  ].filter(r => r.time || !r.dim);
}

const MemberDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member, currentUser } = route.params as { member: MemberStatus; currentUser: User };
  const { showAlert } = useAlert();

  const [liveStatus, setLiveStatus] = useState<{ location?: Location; checkIn?: CheckIn; lastLocationError?: LocationError }>({
    location: member.location,
    checkIn: member.checkIn,
    lastLocationError: member.lastLocationError,
  });
  const [repinging, setRepinging] = useState(false);
  const [pinged, setPinged] = useState(false);
  const pingDotAnim = useRef(new Animated.Value(1)).current;

  const isSelf = member.uid === currentUser.uid;
  const now = usePendingTimeout(liveStatus.checkIn);
  const { status, timedOut: isTimedOut } = deriveDisplayStatus(liveStatus.checkIn, now);
  const statusLabel = isTimedOut ? 'No response' : STATUS_LABEL[status];
  const statusColor = STATUS_COLOR[status];
  const pulse = status === 'pending' || status === 'need_help';
  const hasLocation = !!(liveStatus.location?.lat && liveStatus.location?.lng);

  const lastSeenText = liveStatus.checkIn?.respondedAt
    ? formatDistanceToNow(liveStatus.checkIn.respondedAt, { addSuffix: true })
    : liveStatus.location?.timestamp
    ? formatDistanceToNow(liveStatus.location.timestamp, { addSuffix: true })
    : null;

  useEffect(() => {
    if (!pulse) {
      pingDotAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pingDotAnim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pingDotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pingDotAnim]);

  useEffect(() => {
    const groupId = currentUser.familyGroupId!;
    const ref = database().ref(`/familyGroups/${groupId}/memberStatus/${member.uid}`);
    const handler = (snap: any) => {
      const val = snap.val();
      if (val) setLiveStatus({
        location: val.location,
        checkIn: val.checkIn,
        lastLocationError: val.lastLocationError,
      });
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePing = async () => {
    if (repinging || pinged) return;
    setRepinging(true);
    try {
      await CheckInService.sendCheckInRequest(
        currentUser.uid,
        currentUser.displayName ?? 'Someone',
        member.uid,
        member.displayName ?? 'your family member',
        currentUser.familyGroupId!,
      );
      setPinged(true);
      setTimeout(() => setPinged(false), 3000);
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

  const rows = activityRows(status, liveStatus.checkIn, liveStatus.location, isTimedOut);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.navRole}>{member.role ?? 'Member'}</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(member.displayName)}</Text>
            </View>
            {/* Status dot badge */}
            <View style={[styles.statusBadgeWrap, { borderColor: COLORS.background.primary }]}>
              <Animated.View
                style={[
                  styles.statusBadgeDot,
                  { backgroundColor: statusColor },
                  pulse && { opacity: pingDotAnim },
                ]}
              />
            </View>
          </View>

          <Text style={styles.heroName}>{member.displayName ?? 'Family Member'}</Text>

          <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A`, borderColor: `${statusColor}48` }]}>
            <View style={[styles.statusPillDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Location card */}
        <View style={styles.card}>
          <View style={styles.locationTop}>
            <Text style={styles.sectionLabel}>Last known location</Text>
            {hasLocation ? (
              <>
                <Text style={styles.locationCoord}>
                  {formatCoord(liveStatus.location!.lat, liveStatus.location!.lng)}
                </Text>
                <Text style={styles.locationMeta}>
                  {lastSeenText ?? 'just now'} · ±{Math.round(liveStatus.location!.accuracy)} m
                </Text>
              </>
            ) : liveStatus.lastLocationError ? (
              <>
                <Text style={[styles.locationCoord, styles.locationError]}>
                  {describeLocationError(liveStatus.lastLocationError.reason)}
                </Text>
                <Text style={styles.locationMeta}>
                  {formatDistanceToNow(liveStatus.lastLocationError.at, { addSuffix: true })}
                </Text>
              </>
            ) : (
              <Text style={styles.locationCoord}>No location data</Text>
            )}
          </View>

          {/* Map tile */}
          <View style={styles.mapPlaceholder}>
            {hasLocation ? (
              <>
                <Map
                  style={styles.mapView}
                  mapStyle="https://tiles.openfreemap.org/styles/liberty"
                  attribution={false}
                  logo={false}
                  compass={false}
                  scaleBar={false}
                  dragPan={false}
                  touchZoom={false}
                  doubleTapZoom={false}
                  doubleTapHoldZoom={false}
                  touchRotate={false}
                  touchPitch={false}
                >
                  <Camera
                    center={[liveStatus.location!.lng, liveStatus.location!.lat]}
                    zoom={15}
                  />
                  <Marker lngLat={[liveStatus.location!.lng, liveStatus.location!.lat]}>
                    <View style={[styles.mapMarker, { backgroundColor: statusColor }]} />
                  </Marker>
                </Map>
                <TouchableOpacity
                  style={styles.mapAttributionWrap}
                  onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mapAttribution}>© OpenStreetMap · OpenFreeMap</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.mapComment}>{'// awaiting location'}</Text>
            )}
          </View>

          {/* Open in Maps | Directions */}
          <View style={styles.mapActions}>
            <TouchableOpacity
              style={styles.mapActionBtn}
              onPress={() => hasLocation && openInMaps(liveStatus.location!.lat, liveStatus.location!.lng, member.displayName ?? 'Location')}
              activeOpacity={0.7}
            >
              <Text style={[styles.mapActionText, !hasLocation && styles.mapActionDisabled]}>Open in Maps</Text>
            </TouchableOpacity>
            <View style={styles.mapActionDivider} />
            <TouchableOpacity
              style={styles.mapActionBtn}
              onPress={() => hasLocation && getDirections(liveStatus.location!.lat, liveStatus.location!.lng)}
              activeOpacity={0.7}
            >
              <Text style={[styles.mapActionText, !hasLocation && styles.mapActionDisabled]}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={[styles.sectionLabel, styles.activityLabel]}>Recent activity</Text>
          <View style={styles.activityList}>
            {rows.map((r, i) => (
              <View key={i} style={styles.activityRow}>
                <View style={[styles.activityDot, i === 0 ? styles.activityDotActive : styles.activityDotDim]} />
                <Text style={[styles.activityText, i !== 0 && styles.activityTextDim]}>{r.text}</Text>
                {r.time && <Text style={styles.activityTime}>{r.time}</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* Ping CTA */}
        {!isSelf && status !== 'pending' && (
          <TouchableOpacity
            onPress={handlePing}
            disabled={repinging || pinged}
            activeOpacity={0.88}
            style={repinging ? styles.pingBtnDisabled : undefined}
          >
            {pinged ? (
              <View style={styles.pingBtnSent}>
                <Icon name="checkmark" size={16} color={COLORS.accent.green} />
                <Text style={styles.pingBtnSentText}>Ping sent</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[COLORS.gradient.buttonStart, COLORS.gradient.buttonEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pingBtn}
              >
                {repinging
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.pingBtnText}>
                      {status === 'need_help' ? 'Call now' :
                       isTimedOut            ? 'Try again' :
                       'Ping — Are you okay?'}
                    </Text>
                }
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background.primary },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRole: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
  },
  navSpacer: { width: 36 },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.md,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1.5,
    borderColor: COLORS.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: -0.5,
  },
  statusBadgeWrap: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.background.primary,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  heroName: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    letterSpacing: -0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: TYPOGRAPHY.fontSize.sm + 0.5,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  // Cards
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xlarge,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  // Location
  locationTop: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sectionLabel: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.xs,
  },
  locationCoord: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: 2,
  },
  locationError: {
    color: COLORS.status.needHelp,
  },
  locationMeta: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 2,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: COLORS.background.tertiary,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border.subtle,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapComment: {
    fontFamily: 'monospace',
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.dim,
  },
  mapMarker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: COLORS.background.primary,
  },
  mapAttributionWrap: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(13, 17, 23, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mapAttribution: {
    color: COLORS.text.secondary,
    fontSize: 9.5,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  mapActions: {
    flexDirection: 'row',
  },
  mapActionBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapActionText: {
    color: COLORS.accent.green,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  mapActionDisabled: {
    opacity: 0.4,
  },
  mapActionDivider: {
    width: 1,
    backgroundColor: COLORS.border.subtle,
    marginVertical: SPACING.sm,
  },

  // Activity
  activityLabel: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  activityList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm + 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  activityDotActive: {
    backgroundColor: COLORS.text.secondary,
  },
  activityDotDim: {
    backgroundColor: COLORS.text.dim,
  },
  activityText: {
    color: COLORS.text.secondary,
    fontSize: 13.5,
    flex: 1,
  },
  activityTextDim: {
    color: COLORS.text.tertiary,
  },
  activityTime: {
    color: COLORS.text.dim,
    fontSize: 12,
  },

  // Ping button
  pingBtn: {
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.green,
  },
  pingBtnDisabled: {
    opacity: 0.6,
  },
  pingBtnText: {
    color: '#052A20',
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: -0.1,
  },
  pingBtnSent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 17,
    borderRadius: RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.accent.greenDim,
    backgroundColor: COLORS.accent.greenSubtle,
  },
  pingBtnSentText: {
    color: COLORS.accent.green,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default MemberDetailScreen;
