import { Availability } from '../types';

const DEFAULT_START = '09:00';
const DEFAULT_END = '17:00';

export const availabilityDays: Availability['day'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const defaultAvailability: Availability[] = availabilityDays.map((day) => ({
  day,
  available: false,
  startTime: DEFAULT_START,
  endTime: DEFAULT_END,
}));

type MaybeAvailability = Partial<Availability> & { day?: string };

function normalizeEntry(item: MaybeAvailability): Availability | null {
  const day = typeof item.day === 'string' ? (item.day.toLowerCase() as Availability['day']) : null;
  if (!day || !availabilityDays.includes(day)) return null;

  return {
    day,
    available: Boolean(item.available),
    startTime: typeof item.startTime === 'string' && item.startTime.trim() ? item.startTime : DEFAULT_START,
    endTime: typeof item.endTime === 'string' && item.endTime.trim() ? item.endTime : DEFAULT_END,
  };
}

export function normalizeAvailability(raw?: unknown): Availability[] {
  const byDay = new Map<Availability['day'], Availability>();

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const normalized = normalizeEntry(item as MaybeAvailability);
      if (normalized) byDay.set(normalized.day, normalized);
    });
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw as Record<string, unknown>).forEach(([dayKey, value]) => {
      const normalized = normalizeEntry({ ...(value as MaybeAvailability), day: dayKey });
      if (normalized) byDay.set(normalized.day, normalized);
    });
  }

  return availabilityDays.map(
    (day) => byDay.get(day) ?? { day, available: false, startTime: DEFAULT_START, endTime: DEFAULT_END }
  );
}
