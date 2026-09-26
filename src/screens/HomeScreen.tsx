import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, SafeAreaView, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { WORKOUTS } from '../constants/workouts';
import { COLORS, SPACING } from '../constants/theme';
import { getActiveEntitlement, addCustomerInfoListener, getHighestEntitlement } from '../lib/revenuecat';
import WorkoutSessionScreen from './WorkoutSessionScreen';
import NutritionScreen from './NutritionScreen';
import ChatScreen from './ChatScreen';
import ProfileScreen from './ProfileScreen';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';

type Tab = 'workouts' | 'nutrition' | 'chat' | 'profile';

export default function HomeScreen({
  session,
  rcReady,
  onEntitlementChange,
}: {
  session: Session;
  rcReady: boolean;
  onEntitlementChange: (tier: string) => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('workouts');
  const [entitlement, setEntitlement] = useState<string>('go');

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  // Listen for RevenueCat entitlement changes
  useEffect(() => {
    const unsubscribe = addCustomerInfoListener((customerInfo) => {
      const tier = getHighestEntitlement(customerInfo);
      setEntitlement(tier);
      onEntitlementChange(tier);
    });
    return unsubscribe;
  }, []);

  // Initial entitlement fetch
  useEffect(() => {
    if (rcReady) {
      getActiveEntitlement().then((tier) => {
        setEntitlement(tier);
        onEntitlementChange(tier);
      });
    }
  }, [rcReady]);

  async function getProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      if (data) setProfile(data);
    } catch (error: any) {
      console.log('Profile fetch error:', error.message);
    }
  }

  // Use RevenueCat entitlement as primary source, fall back to profile tier
  const tier = entitlement || profile?.subscription_tier || 'go';

  const isTabLocked = (tab: Tab) => {
    if (tab === 'workouts' || tab === 'profile') return false;
    if (tier === 'go') return true;
    return false; // Core, VIP, and Elite get everything else
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'workouts':
        return (
          <ScrollView style={styles.workoutList}>
            <View style={styles.workoutsHeader}>
              <Text style={styles.sectionHeader}>Available Workouts</Text>
              <TouchableOpacity 
                style={styles.libraryButton}
                onPress={() => setShowExerciseLibrary(true)}
              >
                <Text style={styles.libraryButtonText}>LIBRARY</Text>
              </TouchableOpacity>
            </View>
            {WORKOUTS.map((workout) => (
              <TouchableOpacity 
                key={workout.id} 
                style={styles.workoutCard}
                onPress={() => setSelectedWorkoutId(workout.id)}
              >
                <View>
                  <Text style={styles.cardTitle}>{workout.title}</Text>
                  <Text style={styles.cardInfo}>Phase {workout.phase} • Week {workout.week}</Text>
                </View>
                <View style={styles.startBadge}>
                  <Text style={styles.startButton}>START</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        );
      case 'nutrition':
        return <NutritionScreen userId={session.user.id} />;
      case 'chat':
        return <ChatScreen userId={session.user.id} userEmail={session.user.email || ''} />;
      case 'profile':
        return <ProfileScreen session={session} onUpdate={getProfile} />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label }: { tab: Tab; label: string }) => {
    const locked = isTabLocked(tab);
    return (
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === tab && styles.activeTab]}
        onPress={() => !locked && setActiveTab(tab)}
      >
        <Text style={[
          styles.tabText, 
          activeTab === tab && styles.activeTabText,
          locked && styles.lockedTabText
        ]}>
          {label} {locked ? '🔒' : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/branding/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View>
          <Text style={styles.title}>ECHELON FORM</Text>
          <Text style={styles.subtitle}>{tier.toUpperCase()} MEMBER</Text>
        </View>
      </View>
      
      <View style={styles.tabContainer}>
        <TabButton tab="workouts" label="Train" />
        <TabButton tab="nutrition" label="Fuel" />
        <TabButton tab="chat" label="Coach" />
        <TabButton tab="profile" label="You" />
      </View>

      <View style={styles.mainContent}>
        {renderContent()}
      </View>

      <Modal
        visible={!!selectedWorkoutId}
        animationType="slide"
        onRequestClose={() => setSelectedWorkoutId(null)}
      >
        {selectedWorkoutId && (
          <WorkoutSessionScreen 
            workoutId={selectedWorkoutId} 
            userId={session.user.id}
            onClose={() => setSelectedWorkoutId(null)}
          />
        )}
      </Modal>

      <Modal
        visible={showExerciseLibrary}
        animationType="slide"
        onRequestClose={() => setShowExerciseLibrary(false)}
      >
        <ExerciseLibraryScreen />
        <TouchableOpacity 
          style={styles.closeLibraryButton}
          onPress={() => setShowExerciseLibrary(false)}
        >
          <Text style={styles.closeLibraryButtonText}>BACK TO TRAINING</Text>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  lockedTabText: {
    color: '#444',
  },
  mainContent: {
    flex: 1,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  libraryButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  libraryButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  workoutList: {
    flex: 1,
  },
  workoutCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  startBadge: {
    backgroundColor: COLORS.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  startButton: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  closeLibraryButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    alignItems: 'center',
  },
  closeLibraryButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
});