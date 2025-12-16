/**
 * Debug logger utility
 * All debug/trace logs are gated behind NEXT_PUBLIC_DEBUG_LOGS=1
 * By default, all logging functions are no-ops to keep production console clean
 */

const DEBUG_LOGS_ENABLED = process.env.NEXT_PUBLIC_DEBUG_LOGS === '1';

export const debugLog = (...args: any[]) => {
  if (DEBUG_LOGS_ENABLED) {
    console.log(...args);
  }
};

export const traceLog = (...args: any[]) => {
  if (DEBUG_LOGS_ENABLED) {
    console.trace(...args);
  }
};

export const infoLog = (...args: any[]) => {
  if (DEBUG_LOGS_ENABLED) {
    console.info(...args);
  }
};

export const warnLog = (...args: any[]) => {
  if (DEBUG_LOGS_ENABLED) {
    console.warn(...args);
  }
};

// Note: console.error is NOT gated - real errors should always be logged

