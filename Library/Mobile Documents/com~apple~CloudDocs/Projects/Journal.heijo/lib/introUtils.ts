/**
 * Utility functions for managing the intro animation state
 */

export const INTRO_STORAGE_KEY = 'heijoIntroPlayed';

/**
 * Check if the intro animation has been shown before
 */
export const hasSeenIntro = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(INTRO_STORAGE_KEY) === 'true';
};

/**
 * Mark the intro animation as shown
 */
export const markIntroAsShown = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INTRO_STORAGE_KEY, 'true');
};

/**
 * Reset the intro animation (for testing purposes)
 */
export const resetIntro = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INTRO_STORAGE_KEY);
};

/**
 * Force show the intro animation (for testing purposes)
 */
export const forceShowIntro = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(INTRO_STORAGE_KEY);
  window.location.href = '/';
};
