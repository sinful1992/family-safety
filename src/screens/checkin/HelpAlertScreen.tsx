import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Vibration,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import database from '@react-native-firebase/database';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { formatDistanceToNow } from 'date-fns';
import ScreenWakeService from '../../services/ScreenWakeService';
import { Location } from '../../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../../styles/theme';

function formatCoord(lat: number, lng: number): string {
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}  ${lngStr}`;
}

function openInMaps(lat: number, lng: number, label: string) {
  const enc = encodeURIComponent(label);
  Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${enc})`).catch(() =>
    Linking.openURL(`https://maps.google.com/maps?q=${lat},${lng}`),
  );
}

function getDirections(lat: number, lng: number) {
  Linking.openURL(`google.navigation:q=${lat},${lng}`).catch(() =>
    Linking.openURL(`https://maps.google.com/maps?daddr=${lat},${lng}`),
  );
}

const HelpAlertScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { senderUid, senderName, groupId } = route.params as {
    senderUid: string;
    senderName: string;
    groupId: string;
  };

  const [location, setLocation] = useState<Location | null>(null);

  // Pulse animation for the danger ring
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;
  // Fade-in for the whole screen
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasLocation = !!(location?.lat && location?.lng);

  // Screen wake + vibration
  useEffect(() => {
    ScreenWakeService.setKeepScreenOn(true);
    Vibration.vibrate([0, 400, 100, 400, 100, 800], true);
    const timeout = setTimeout(() => Vibration.cancel(), 45_000);
    return () => {
      ScreenWakeService.setKeepScreenOn(false);
      Vibration.cancel();
      clearTimeout(timeout);
    };
  }, []);

  // Heartbeat pulse on the danger ring
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.0, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(500),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim, pulseOpacity]);

  // Screen fade-in
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [fadeAnim]);

  // Live location from Firebase
  useEffect(() => {
    const ref = database().ref(`/familyGroups/${groupId}/memberStatus/${senderUid}/location`);
    const handler = (snap: any) => {
      const val = snap.val();
      if (val) setLocation(val);
    };
    ref.on('value', handler);
    return () => ref.off('value', handler);
  }, [groupId, senderUid]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          {/* ── DANGER HEADER ─────────────────────────────────── */}
          <View style={styles.header}>
            {/* Ambient glow bar at very top */}
            <View style={styles.glowBar} />

            {/* Pulsing beacon */}
            <View style={styles.beaconWrap}>
              {/* Outer pulse ring */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
                ]}
              />
              {/* Icon container */}
              <View style={styles.iconRing}>
                <Icon name="warning" size={32} color={COLORS.accent.red} />
              </View>
            </View>

            {/* Name */}
            {/* {senderName} — injected at runtime */}
            <Text style={styles.senderName} numberOfLines={1} adjustsFontSizeToFit>
              {senderName}
            </Text>

            {/* Status line */}
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusLabel}>NEEDS HELP NOW</Text>
            </View>

            {/* Divider */}
            <View style={styles.headerDivider} />
          </View>

          {/* ── LOCATION CARD ─────────────────────────────────── */}
          <View style={styles.card}>

            {/* Card header */}
            <View style={styles.cardHeader}>
              <Icon name="location" size={13} color={COLORS.accent.red} style={styles.cardHeaderIcon} />
              <Text style={styles.cardLabel}>LOCATION</Text>
            </View>

            {/* Map tile */}
            <View style={styles.mapTile}>
              {hasLocation ? (
                <>
                  {/* {MapLibre map — injected} */}
                  <Map
                    style={StyleSheet.absoluteFill}
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
                    <Camera center={[location!.lng, location!.lat]} zoom={15} />
                    <Marker lngLat={[location!.lng, location!.lat]}>
                      <View style={styles.mapMarker}>
                        <View style={styles.mapMarkerCore} />
                      </View>
                    </Marker>
                  </Map>

                  {/* Map attribution */}
                  <TouchableOpacity
                    style={styles.attribution}
                    onPress={() =>
                      Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {})
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.attributionText}>© OpenStreetMap · OpenFreeMap</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* Placeholder when location hasn't arrived yet */
                <View style={styles.mapPlaceholder}>
                  <Icon name="location-outline" size={22} color={COLORS.text.dim} />
                  <Text style={styles.mapPlaceholderText}>Waiting for location…</Text>
                </View>
              )}
            </View>

            {/* Coordinates row */}
            <View style={styles.coordRow}>
              {hasLocation ? (
                <>
                  {/* {formatted lat/lng — injected} */}
                  <Text style={styles.coordText}>{formatCoord(location!.lat, location!.lng)}</Text>
                  {/* {timestamp + accuracy — injected} */}
                  <Text style={styles.coordMeta}>
                    {formatDistanceToNow(location!.timestamp, { addSuffix: true })}
                    {'  ·  '}
                    ±{Math.round(location!.accuracy)} m
                  </Text>
                </>
              ) : (
                <Text style={styles.coordWaiting}>—</Text>
              )}
            </View>

            {/* Map action buttons */}
            <View style={styles.mapActions}>
              <TouchableOpacity
                style={[styles.mapAction, !hasLocation && styles.mapActionDisabled]}
                onPress={() =>
                  hasLocation && openInMaps(location!.lat, location!.lng, senderName)
                }
                activeOpacity={0.7}
                disabled={!hasLocation}
              >
                <Icon
                  name="map-outline"
                  size={14}
                  color={hasLocation ? COLORS.accent.red : COLORS.text.dim}
                  style={styles.mapActionIcon}
                />
                <Text style={[styles.mapActionText, !hasLocation && styles.mapActionTextDisabled]}>
                  Open in Maps
                </Text>
              </TouchableOpacity>

              <View style={styles.mapActionSep} />

              <TouchableOpacity
                style={[styles.mapAction, !hasLocation && styles.mapActionDisabled]}
                onPress={() => hasLocation && getDirections(location!.lat, location!.lng)}
                activeOpacity={0.7}
                disabled={!hasLocation}
              >
                <Icon
                  name="navigate-outline"
                  size={14}
                  color={hasLocation ? COLORS.accent.red : COLORS.text.dim}
                  style={styles.mapActionIcon}
                />
                <Text style={[styles.mapActionText, !hasLocation && styles.mapActionTextDisabled]}>
                  Directions
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

        {/* ── DISMISS ────────────────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },

  // ── HEADER ────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    position: 'relative',
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accent.red,
    shadowColor: COLORS.accent.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },

  beaconWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.sm,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.redDim,
  },
  iconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent.redSubtle,
    borderWidth: 1.5,
    borderColor: COLORS.accent.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  senderName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.8,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: SPACING.xl,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent.red,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs ?? 11,
    fontWeight: '700',
    color: COLORS.accent.red,
    letterSpacing: 2,
  },

  headerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── LOCATION CARD ─────────────────────────────────────────
  card: {
    marginHorizontal: SPACING.lg ?? 16,
    marginTop: SPACING.lg ?? 16,
    backgroundColor: '#161B22',
    borderRadius: RADIUS.xlarge ?? 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md ?? 12,
    paddingTop: SPACING.md ?? 12,
    paddingBottom: SPACING.sm ?? 8,
    gap: 5,
  },
  cardHeaderIcon: {
    marginTop: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    letterSpacing: 1.5,
  },

  mapTile: {
    height: 160,
    backgroundColor: '#0D1117',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm ?? 8,
  },
  mapPlaceholderText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.dim,
    letterSpacing: 0.2,
  },

  // Red map pin
  mapMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent.red,
    borderWidth: 1.5,
    borderColor: '#fff',
  },

  attribution: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    backgroundColor: 'rgba(13,17,23,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attributionText: {
    fontSize: 9,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },

  coordRow: {
    paddingHorizontal: SPACING.md ?? 12,
    paddingTop: SPACING.sm + 2 ?? 10,
    paddingBottom: SPACING.xs ?? 6,
    gap: 3,
  },
  coordText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  coordMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs ?? 11,
    color: COLORS.text.dim,
    letterSpacing: 0.3,
  },
  coordWaiting: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.dim,
  },

  mapActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: SPACING.xs ?? 4,
  },
  mapAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md ?? 12,
    gap: 5,
  },
  mapActionDisabled: {
    opacity: 0.38,
  },
  mapActionIcon: {
    marginTop: 1,
  },
  mapActionText: {
    fontSize: TYPOGRAPHY.fontSize.sm + 0.5,
    fontWeight: '600',
    color: COLORS.accent.red,
  },
  mapActionTextDisabled: {
    color: COLORS.text.dim,
  },
  mapActionSep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: SPACING.sm ?? 8,
  },

  // ── FOOTER ────────────────────────────────────────────────
  footer: {
    paddingHorizontal: SPACING.lg ?? 16,
    paddingVertical: SPACING.lg ?? 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dismissBtn: {
    paddingVertical: 16,
    borderRadius: RADIUS.large ?? 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dismissText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: '600',
    color: COLORS.text.secondary,
    letterSpacing: 0.2,
  },
});

export default HelpAlertScreen;
