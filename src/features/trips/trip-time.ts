const minutesPerDay = 24 * 60;
const lastMinuteOfDay = minutesPerDay - 1;

export function formatMinuteOfDay(minute: number) {
  const clampedMinute = clampMinute(minute);
  const hours = Math.floor(clampedMinute / 60);
  const minutes = clampedMinute % 60;

  return `${padTimePart(hours)}:${padTimePart(minutes)}`;
}

export function snapMinuteToHalfHour(y: number, timelineHeight: number) {
  if (timelineHeight <= 0) {
    return 0;
  }

  const ratio = Math.max(0, Math.min(1, y / timelineHeight));
  const rawMinute = ratio * minutesPerDay;
  const snappedMinute = Math.floor(rawMinute / 30) * 30;

  return Math.min(23 * 60 + 30, Math.max(0, snappedMinute));
}

export function clampMinute(minute: number) {
  if (!Number.isFinite(minute)) {
    return 0;
  }

  return Math.max(0, Math.min(lastMinuteOfDay, Math.round(minute)));
}

function padTimePart(value: number) {
  return String(value).padStart(2, '0');
}
