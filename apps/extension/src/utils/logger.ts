if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).SPLogs = {
    debug: [] as string[],
    warn: [] as string[],
  };
}

function entry(msg: string): string {
  return `[${new Date().toISOString()}] ${msg}`;
}

export function logDebug(msg: string): void {
  if (typeof window !== 'undefined') {
    const logs = (window as unknown as Record<string, { debug: string[] }>).SPLogs;
    logs.debug.push(entry(msg));
  } else {
    console.log('[SponsorPulse]', msg);
  }
}

export function logWarn(msg: string): void {
  if (typeof window !== 'undefined') {
    const logs = (window as unknown as Record<string, { warn: string[] }>).SPLogs;
    logs.warn.push(entry(msg));
  } else {
    console.warn('[SponsorPulse]', msg);
  }
}

export function getLogs(): { debug: string[]; warn: string[] } {
  if (typeof window === 'undefined') return { debug: [], warn: [] };
  return (
    (window as unknown as Record<string, { debug: string[]; warn: string[] }>).SPLogs ?? {
      debug: [],
      warn: [],
    }
  );
}
