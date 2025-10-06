export function trace(msg: string, extra: Record<string, any> = {}) {
  if (process.env.NEXT_PUBLIC_DEBUG !== '1') return;
  // eslint-disable-next-line no-console
  console.log(`[Heijo][Diag] ${msg}`, { ts: new Date().toISOString(), ...extra });
}
