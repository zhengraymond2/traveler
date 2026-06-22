export type DayTimelineLabel = {
  primary: string;
  secondary: string | null;
};

const shortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  timeZone: 'UTC',
});
const longMonthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
});
const shortWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
});
const longWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
});

export function getDayTimelineLabel(dayIndex: number, startDate: string | Date | null | undefined): DayTimelineLabel {
  const date = addDays(startDate, dayIndex);

  if (!date) {
    return { primary: String(dayIndex + 1), secondary: null };
  }

  return {
    primary: `${shortMonthFormatter.format(date)} ${date.getUTCDate()}`,
    secondary: shortWeekdayFormatter.format(date),
  };
}

export function getExpandedDayTitle(
  dayIndex: number,
  startDate: string | Date | null | undefined,
  customTitle: string | null | undefined
) {
  const normalizedTitle = customTitle?.trim();
  if (normalizedTitle) {
    return normalizedTitle;
  }

  const date = addDays(startDate, dayIndex);
  if (!date) {
    return `Day ${dayIndex + 1}`;
  }

  return `${longMonthFormatter.format(date)} ${date.getUTCDate()} ${longWeekdayFormatter.format(date)}`;
}

function addDays(startDate: string | Date | null | undefined, dayIndex: number) {
  const date = parseDate(startDate);
  if (!date) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date;
}

function parseDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
