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
import { MemberStatus, User } from '../../types';
import FamilyMemberService from '../../services/FamilyMemberService';
import BeaconCard from '../../components/BeaconCard';
import { COLORS, TYPOGRAPHY, SPACING } from '../../styles/theme';

interface HomeScreenProps {
  user: User;
  previewMembers?: MemberStatus[];
}

const HomeScreen: React.FC<HomeScreenProps> = ({ user, previewMembers }) => {
  const navigation = useNavigation();
  const [members, setMembers] = useState<MemberStatus[]>(previewMembers ?? []);
  const [loading, setLoading] = useState(!previewMembers);
  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(() => {
    if (previewMembers || !user.familyGroupId) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

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
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
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

  const otherMembers = members.filter(m => m.uid !== user.uid);
  const selfMember = members.find(m => m.uid === user.uid);

  const renderItem = ({ item }: { item: MemberStatus }) => (
    <View style={styles.cardWrapper}>
      <BeaconCard
        member={item}
        onPress={() => handleMemberPress(item)}
        isSelf={item.uid === user.uid}
      />
    </View>
  );

  const allMembers = selfMember
    ? [selfMember, ...otherMembers]
    : otherMembers;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Family</Text>
          <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleSettingsPress}>
          <Icon name="settings-outline" size={22} color={COLORS.text.secondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent.green} />
        </View>
      ) : members.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="people-outline" size={56} color={COLORS.text.dim} />
          <Text style={styles.emptyTitle}>No family members yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your invitation code from Settings to add family members.
          </Text>
        </View>
      ) : (
        <FlatList
          data={allMembers}
          keyExtractor={item => item.uid}
          renderItem={renderItem}
          numColumns={2}
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSize.display,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    color: COLORS.text.primary,
    letterSpacing: -0.5,
  },
  memberCount: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.glass.subtle,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  grid: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  row: {
    gap: SPACING.md,
    marginBottom: SPACING.md,
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
