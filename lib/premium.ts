/**
 * Premium Feature Management
 * 
 * TODO: Future Development - Replace manual premium check with payment API verification
 * When ready for Chrome Web Store and App Store:
 * 1. Implement Chrome Web Store payment API verification
 * 2. Implement App Store in-app purchase verification
 * 3. Replace checkPremiumStatus() with API calls
 * 4. Store premium status in user_metadata.premium
 */

import { supabase } from './supabaseClient';

export interface PremiumStatus {
  isPremium: boolean;
  source: 'user_metadata' | 'platform_receipt' | 'manual';
}

/**
 * Check if user has premium status
 * For now: Checks user_metadata.premium (manual testing)
 * Future: Will check platform receipts (Chrome/App Store)
 */
export async function checkPremiumStatus(): Promise<PremiumStatus> {
  if (!supabase) {
    return { isPremium: false, source: 'manual' };
  }

  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { isPremium: false, source: 'manual' };
    }

    // Check user_metadata.premium
    const premium = user.user_metadata?.premium;
    if (premium === true) {
      return { isPremium: true, source: 'user_metadata' };
    }

    // TODO: Future - Check platform receipts
    // if (isChromeWebStore()) {
    //   const receipt = await verifyChromeReceipt(user.id);
    //   if (receipt.valid) return { isPremium: true, source: 'platform_receipt' };
    // }
    // if (isAppStore()) {
    //   const receipt = await verifyAppStoreReceipt(user.id);
    //   if (receipt.valid) return { isPremium: true, source: 'platform_receipt' };
    // }

    return { isPremium: false, source: 'manual' };
  } catch (error) {
    console.error('Error checking premium status:', error);
    return { isPremium: false, source: 'manual' };
  }
}

/**
 * Activate premium status (for testing/manual activation)
 * TODO: Future - Replace with payment API activation
 */
export async function activatePremium(): Promise<{ error: any }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Update user_metadata.premium
    const { error } = await supabase.auth.updateUser({
      data: { premium: true }
    });

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}

/**
 * Deactivate premium status
 * Note: User has 24 hours to export data before Supabase access is revoked
 */
export async function deactivatePremium(): Promise<{ error: any }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    // Update user_metadata.premium
    const { error } = await supabase.auth.updateUser({
      data: { premium: false }
    });

    if (error) {
      return { error };
    }

    // TODO: Future - Schedule Supabase data deletion after 24 hours
    // This would be handled by a backend job or Supabase Edge Function

    return { error: null };
  } catch (error) {
    return { error };
  }
}

