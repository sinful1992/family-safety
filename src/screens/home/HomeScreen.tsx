import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MemberStatus, User, CheckInStatus } from '../../types';
import FamilyMemberService from '../../services/FamilyMemberService';
import CheckInService from '../../services/CheckInService';
import BeaconCard from '../../components/BeaconCard';
import FamilyPulse from '../../components/FamilyPulse';
import NeedHelpSheet from '../../components/NeedHelpSheet';
import { COLORS, TYPOGRAPHY, SPACING } from '../../styles/theme';

function greeting(name: string | null | undefined): string {
  const hour = new Date().getHours();
  const salutation =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 18 ? 'Good afternoon' :
    hour >= 18 && hour < 22 ? 'Good evening' :
    'Good night';
  const first = name?.split(' ')[0] ?? '';
  return first ? `${salutation}, ${first}` : salutation;
}

interface HomeScreenProps {
  user: User;
  previewMembers?: MemberStatus[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, previewMembers }) => {
  const navigation = useNavigation();
  const [members, setMembers] = useState<MemberStatus[]>(previewMembers ?? []);
  const [loading, setLoading] = useState(!previewMembers);
  const [refreshing, setRefreshing] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [showNeedHelp, setShowNeedHelp] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(() => {
    if (previewMembers || !user.familyGroupId) return;

    unsubscribeRef.current?.();

    unsubscribeRef.current = FamilyMemberService.listenToGroupMembers(
      user.familyGroupId,
      updatedMembers => {
        setMembers(updatedMembers);
        setLoading(false);
        setRefreshing(false);
      },
    );
  }, [user.familyGroupId, previewMembers]);

  useEffect(() => {
    startListening();
    return () => { unsubscribeRef.current?.(); };
  }, [startListening]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    startListening();
  }, [startListening]);

  const handleMemberPress = (member: MemberStatus) => {
    (navigation as any).navigate('MemberDetail', { member, currentUser: user });
  };

  const handleSettingsPress = () => {
    (navigation as any).navigate('Settings', { user });
  };

  const handlePingAll = useCallback(async () => {
    if (pinging || !user.familyGroupId) return;
    setPinging(true);
    try {
      const targets = members.filter(
        m => m.uid !== user.uid && (m.checkIn?.status as CheckInStatus) !== 'okay',
      );
      await Promise.all(
        targets.map(m =>
          CheckInService.sendCheckInRequest(
            user.uid,
            user.displayName ?? 'A family member',
            m.uid,
            m.displayName ?? 'Family member',
            user.familyGroupId!,
          ).catch(() => {}),
        ),
      );
    } finally {
      setPinging(false);
    }
  }, [pinging, members, user]);

  const otherMembers = members.filter(m => m.uid !== user.uid);

  const renderItem = ({ item }: { item: MemberStatus }) => (
    <View style={styles.cardWrapper}>
      <BeaconCard
        member={item}
        onPress={() => handleMemberPress(item)}
        isSelf={item.uid === user.uid}
      />
    </View>
  );

  const listHeader = members.length > 0 ? (
    <>
      <FamilyPulse
        members={otherMembers}
        pinging={pinging}
        onPingAll={handlePingAll}
        onNeedHelp={() => setShowNeedHelp(true)}
      />
      <View style={styles.memberCountRow}>
        <Text style={styles.memberCountLabel}>{otherMembers.length} member{otherMembers.length !== 1 ? 's' : ''}</Text>
        <Text style={styles.memberCountUpdated}>Updated just now</Text>
      </View>
    </>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting(user.displayName)}</Text>
          <Text style={styles.title}>Family</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSettingsPress}>
            <Icon name="add" size={20} color={COLORS.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleSettingsPress}>
            <Icon name="settings-outline" size={18} color={COLORS.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent.green} />
        </View>
      ) : otherMembers.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="people-outline" size={56} color={COLORS.text.dim} />
          <Text style={styles.emptyTitle}>No family members yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your invitation code from Settings to add family members.
          </Text>
        </View>
      ) : (
        <FlatList
          data={otherMembers}
          keyExtractor={item => item.uid}
          renderItem={renderItem}
          numColumns={2}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent.green}
            />
          }
        />
      )}

      <NeedHelpSheet
        visible={showNeedHelp}
        onClose={() => setShowNeedHelp(false)}
        user={user}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  greeting: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.display,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    letterSpacing: -0.6,
    marginTop: 1,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: SPACING.sm - 1,
    marginTop: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  memberCountLabel: {
    color: COLORS.text.tertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  memberCountUpdated: {
    color: COLORS.text.dim,
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
  },
  grid: {
    paddingBottom: SPACING.xl,
  },
  row: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  cardWrapper: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default HomeScreen;
