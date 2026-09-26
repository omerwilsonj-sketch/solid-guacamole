import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { COLORS, SPACING } from '../constants/theme';
import {
  getActiveEntitlement,
  getOfferings,
  purchasePackage,
  restorePurchases,
  addCustomerInfoListener,
  getHighestEntitlement,
} from '../lib/revenuecat';

interface OfferingPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    introductoryPrice?: {
      priceString: string;
    };
  };
}

interface Offering {
  identifier: string;
  availablePackages: OfferingPackage[];
}

export default function ProfileScreen({ session, onUpdate }: { session: Session; onUpdate: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [entitlement, setEntitlement] = useState<string>('go');
  const [syncing, setSyncing] = useState(false);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (session) getProfile();
    fetchEntitlement();
    fetchOfferings();
  }, [session]);

  // Listen for live entitlement changes from RevenueCat
  useEffect(() => {
    const unsubscribe = addCustomerInfoListener((customerInfo) => {
      const tier = getHighestEntitlement(customerInfo);
      setEntitlement(tier);
      onUpdate();
    });
    return unsubscribe;
  }, []);

  async function fetchEntitlement() {
    const tier = await getActiveEntitlement();
    setEntitlement(tier);
  }

  async function fetchOfferings() {
    setLoadingOfferings(true);
    try {
      const offeringsData = await getOfferings();
      if (offeringsData?.current) {
        setOfferings([offeringsData.current]);
      }
    } catch (error) {
      console.log('Failed to fetch offerings:', error);
    }
    setLoadingOfferings(false);
  }

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

  async function handlePurchase(pkg: any) {
    setPurchasing(pkg.identifier);
    const customerInfo = await purchasePackage(pkg);
    if (customerInfo) {
      const tier = getHighestEntitlement(customerInfo);
      setEntitlement(tier);
      onUpdate();
      Alert.alert('Welcome!', `You are now an ${tier.toUpperCase()} member.`);
    }
    setPurchasing(null);
  }

  async function handleRestore() {
    setSyncing(true);
    const customerInfo = await restorePurchases();
    if (customerInfo) {
      const tier = getHighestEntitlement(customerInfo);
      setEntitlement(tier);
      onUpdate();
      Alert.alert('Restored', `Your ${tier.toUpperCase()} membership has been restored.`);
    } else {
      Alert.alert('No Purchases', 'No previous purchases were found to restore.');
    }
    setSyncing(false);
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite': return '#FFD700';
      case 'vip': return '#AF52DE';
      case 'core': return COLORS.primary;
      default: return COLORS.success;
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'elite': return 'ELITE';
      case 'vip': return 'VIP';
      case 'core': return 'CORE';
      default: return 'GO';
    }
  };

  const getTierPrice = (tier: string) => {
    switch (tier) {
      case 'elite': return '£999/mo';
      case 'vip': return '£249/mo';
      case 'core': return '£49/mo';
      case 'go': return '£14.99/mo';
      default: return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {session.user.email?.[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.email}>{session.user.email}</Text>
          <View style={[styles.tierBadge, { backgroundColor: getTierColor(entitlement) }]}>
            <Text style={styles.tierText}>
              {getTierLabel(entitlement)} MEMBER
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {profile?.goal || 'No goals set yet. Start tracking to define your journey.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Current Tier: <Text style={{ fontWeight: 'bold', color: getTierColor(entitlement) }}>
                {getTierLabel(entitlement)}
              </Text>
            </Text>
            <Text style={styles.priceText}>
              {getTierPrice(entitlement)}
            </Text>
            <TouchableOpacity 
              style={styles.syncButton} 
              onPress={handleRestore}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.syncButtonText}>RESTORE PURCHASES</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Offerings / Upgrade Section */}
        {entitlement !== 'elite' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upgrade Your Membership</Text>
            {loadingOfferings ? (
              <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
            ) : offerings.length > 0 ? (
              offerings[0].availablePackages
                .filter((pkg) => {
                  // Filter out the current tier and below
                  const tierMap: Record<string, number> = { go: 0, core: 1, vip: 2, elite: 3 };
                  const currentLevel = tierMap[entitlement] ?? 0;
                  const pkgLevel = tierMap[pkg.identifier] ?? 0;
                  return pkgLevel > currentLevel;
                })
                .map((pkg) => (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={styles.upgradeCard}
                    onPress={() => handlePurchase(pkg)}
                    disabled={purchasing === pkg.identifier}
                  >
                    {purchasing === pkg.identifier ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Text style={styles.upgradeTitle}>
                          {pkg.product.title}
                        </Text>
                        <Text style={styles.upgradeSub}>
                          {pkg.product.description}
                        </Text>
                        <Text style={styles.upgradePrice}>
                          {pkg.product.priceString}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))
            ) : (
              <>
                {/* Fallback upgrade cards if offerings aren't loaded yet */}
                {entitlement === 'go' && (
                  <TouchableOpacity style={styles.upgradeCard} onPress={() => Alert.alert('Upgrade', 'Connect RevenueCat to see live pricing.')}>
                    <Text style={styles.upgradeTitle}>ECHELON CORE — £49/mo</Text>
                    <Text style={styles.upgradeSub}>Weekly group coaching, nutrition dashboard, community chat</Text>
                  </TouchableOpacity>
                )}
                {(entitlement === 'go' || entitlement === 'core') && (
                  <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: '#AF52DE' }]} onPress={() => Alert.alert('Upgrade', 'Connect RevenueCat to see live pricing.')}>
                    <Text style={styles.upgradeTitle}>ECHELON VIP — £249/mo</Text>
                    <Text style={styles.upgradeSub}>1-on-1 coaching, custom macros, weekly video check-ins</Text>
                  </TouchableOpacity>
                )}
                {(entitlement === 'go' || entitlement === 'core' || entitlement === 'vip') && (
                  <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: '#FFD700' }]} onPress={() => Alert.alert('Upgrade', 'Connect RevenueCat to see live pricing.')}>
                    <Text style={[styles.upgradeTitle, { color: '#000' }]}>ECHELON ELITE — £999/mo</Text>
                    <Text style={[styles.upgradeSub, { color: 'rgba(0,0,0,0.7)' }]}>Ultra-premium 1-on-1 coaching, daily check-ins, private executive network</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  email: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  priceText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  syncButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary + '22',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  syncButtonText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  upgradeCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  upgradeSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  upgradePrice: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
  },
  button: {
    backgroundColor: COLORS.error + '22',
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
});