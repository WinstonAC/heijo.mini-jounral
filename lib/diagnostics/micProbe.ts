export async function micEnvProbe() {
  const result: Record<string, any> = { ts: new Date().toISOString() };

  // Basic environment
  result.userAgent = navigator.userAgent;
  result.isSecureContext = (window as any).isSecureContext;
  result.hasMediaDevices = !!(navigator as any).mediaDevices;
  result.hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  result.pageVisibility = document.visibilityState;

  // Permissions API (cross-browser defensive)
  try {
    const perm = (navigator as any).permissions?.query ? await (navigator as any).permissions.query({ name: 'microphone' as PermissionName }) : null;
    result.permissionsApi = !!(navigator as any).permissions;
    result.microphonePermissionState = perm?.state ?? 'unknown';
  } catch (e) {
    result.permissionsQueryError = String(e);
  }

  // Device enumeration
  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.();
    result.deviceKinds = devices?.map(d => d.kind);
    result.audioInputCount = devices?.filter(d => d.kind === 'audioinput')?.length ?? 0;
  } catch (e) {
    result.enumerateDevicesError = String(e);
  }

  // Quick open/close test (no UI side-effects)
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      result.getUserMediaSuccess = true;
      stream.getTracks().forEach(t => t.stop());
    } else {
      result.getUserMediaSuccess = false;
    }
  } catch (e) {
    result.getUserMediaError = {
      name: (e as any)?.name,
      message: (e as any)?.message,
      toString: String(e),
    };
  }

  // Web Speech presence
  result.hasSpeechRecognition = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;

  // Log once in a collapsed group for easy screenshotting
  // eslint-disable-next-line no-console
  console.groupCollapsed('[Heijo][Diag] micEnvProbe'); console.table(result); console.groupEnd();

  return result;
}
