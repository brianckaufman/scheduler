export const POPULAR_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
];

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
}

export function getTimezoneLabel(tz: string): string {
  const popular = POPULAR_TIMEZONES.find((t) => t.value === tz);
  if (popular) return popular.label;
  try {
    const now = new Date();
    const short = now.toLocaleTimeString('en-US', { timeZone: tz, timeZoneName: 'short' });
    const abbr = short.split(' ').pop() || '';
    const friendlyMap: Record<string, string> = {
      EST: 'Eastern Time (ET)',
      EDT: 'Eastern Time (ET)',
      CST: 'Central Time (CT)',
      CDT: 'Central Time (CT)',
      MST: 'Mountain Time (MT)',
      MDT: 'Mountain Time (MT)',
      PST: 'Pacific Time (PT)',
      PDT: 'Pacific Time (PT)',
      GMT: 'GMT',
      UTC: 'UTC',
      BST: 'British Summer Time',
      CET: 'Central European Time',
      CEST: 'Central European Time',
      IST: 'India Standard Time',
      JST: 'Japan Standard Time',
      AEST: 'Australian Eastern Time',
      AEDT: 'Australian Eastern Time',
    };
    return friendlyMap[abbr] || abbr || tz.replace(/_/g, ' ').split('/').pop() || tz;
  } catch {
    return tz.replace(/_/g, ' ').split('/').pop() || tz;
  }
}
