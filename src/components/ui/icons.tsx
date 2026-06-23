/**
 * Polished Pro icon set — one consistent line style (1.8 stroke, currentColor,
 * rounded caps/joins). Size via className (default 1em). Colors come from the
 * surrounding element (e.g. an IconChip sets text-icon-fg).
 */
import type { ReactNode } from 'react';

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className ?? 'w-[18px] h-[18px]'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 3v3M16 3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5Z" /></Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>
);
export const UsersIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6M21 19a6 6 0 0 0-4-5.7" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4.5 12.5l5 5 10-11" /></Svg>
);
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8 15.8 7.2M8.2 13.2l7.6 3.6" /></Svg>
);
export const BookmarkIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3.5L5 20V5.5a1 1 0 0 1 1-1Z" /></Svg>
);
export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const MinusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 9.5l6 6 6-6" /></Svg>
);
export const CopyIcon = (p: IconProps) => (
  <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></Svg>
);
export const CalendarPlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 3v3M16 3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V13" /><path d="M5 5A1.5 1.5 0 0 0 3.5 6.5V19A1.5 1.5 0 0 0 5 20.5h6" /><path d="M16.5 15.5v5M14 18h5" /></Svg>
);
export const GlobeIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" /></Svg>
);
export const TicketIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4Z" /><path d="M14 6v12" /></Svg>
);
