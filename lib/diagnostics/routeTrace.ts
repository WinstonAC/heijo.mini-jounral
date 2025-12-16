import { debugLog } from '../logger';

export function trace(msg: string, extra: Record<string, any> = {}) {
  debugLog(`[Heijo][Diag] ${msg}`, { ts: new Date().toISOString(), ...extra });
}
