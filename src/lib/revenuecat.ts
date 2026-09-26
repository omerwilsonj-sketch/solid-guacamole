import Purchases, {
  PurchasesConfiguration,
  CustomerInfo,
  PurchasesOfferings,
  LOG_LEVEL,
} from 'react-native-purchases';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

// Entitlement IDs configured in RevenueCat dashboard
export const ENTITLEMENTS = {
  GO: 'go',
  CORE: 'core',
  VIP: 'vip',
  ELITE: 'elite',
} as const;

export type Entitlement = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

// Tier hierarchy for feature gating
const TIER_ORDER: Record<string, number> = {
  go: 0,
  core: 1,
  vip: 2,
  elite: 3,
};

/**
 * Initialize RevenueCat Purchases SDK.
 * Must be called once at app startup (in App.tsx).
 */
export async function initRevenueCat(apiKey?: string): Promise<void> {
  const key = apiKey || REVENUECAT_API_KEY;
  if (!key) {
    console.warn('[RevenueCat] No API key configured. Purchases will not be initialized.');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  await Purchases.configure({
    apiKey: key,
  } as PurchasesConfiguration);

  console.log('[RevenueCat] SDK initialized successfully.');
}

/**
 * Identify the current user in RevenueCat.
 * Call this after a user logs in / signs up with Supabase.
 */
export async function identifyUser(userId: string): Promise<void> {
  try {
    await Purchases.logIn(userId);
    console.log(`[RevenueCat] User identified: ${userId}`);
  } catch (error) {
    console.error('[RevenueCat] Failed to identify user:', error);
  }
}

/**
 * Reset the current user's identity in RevenueCat.
 * Call this on logout.
 */
export async function resetUser(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
  } catch (error) {
    console.error('[RevenueCat] Failed to log out user:', error);
  }
}

/**
 * Get the current user's entitlements from RevenueCat.
 * Returns the highest active entitlement tier, or 'go' (free) if none.
 */
export async function getActiveEntitlement(): Promise<Entitlement> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return getHighestEntitlement(customerInfo);
  } catch (error) {
    console.error('[RevenueCat] Failed to get entitlements:', error);
    return 'go' as Entitlement;
  }
}

/**
 * Parse a CustomerInfo object and return the highest active entitlement.
 */
export function getHighestEntitlement(customerInfo: CustomerInfo): Entitlement {
  const active = customerInfo.entitlements.active;
  const entitlements = Object.keys(active);

  if (entitlements.length === 0) return 'go' as Entitlement;

  // Sort by tier order and return the highest
  const sorted = entitlements.sort(
    (a, b) => (TIER_ORDER[b] ?? -1) - (TIER_ORDER[a] ?? -1)
  );

  return sorted[0] as Entitlement;
}

/**
 * Check if a user has access to a specific entitlement level.
 * Higher tiers automatically include lower tiers.
 */
export function hasAccess(
  customerInfo: CustomerInfo | null,
  requiredEntitlement: Entitlement
): boolean {
  if (!customerInfo) return false;
  const currentTier = getHighestEntitlement(customerInfo);
  const currentLevel = TIER_ORDER[currentTier] ?? -1;
  const requiredLevel = TIER_ORDER[requiredEntitlement] ?? -1;
  return currentLevel >= requiredLevel;
}

/**
 * Fetch available offerings (subscription products) from RevenueCat.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a package (subscription) from an offering.
 * Returns the updated CustomerInfo after purchase.
 */
export async function purchasePackage(
  packageToPurchase: any
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
    console.log('[RevenueCat] Purchase successful:', customerInfo);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('[RevenueCat] User cancelled purchase');
    } else {
      console.error('[RevenueCat] Purchase failed:', error);
    }
    return null;
  }
}

/**
 * Restore previous purchases (e.g., for users reinstalling the app).
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('[RevenueCat] Purchases restored:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Failed to restore purchases:', error);
    return null;
  }
}

/**
 * Add a listener for customer info updates (entitlement changes).
 * Returns an unsubscribe function.
 * Use this in App.tsx to react to subscription changes in real-time.
 */
export function addCustomerInfoListener(
  callback: (customerInfo: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(callback);
  };
}