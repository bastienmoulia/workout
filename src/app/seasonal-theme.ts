export const DEFAULT_THEME_COLOR = '#2b0b5e';
export const CHRISTMAS_THEME_COLOR = '#173b2b';

export function isChristmasSeason(date: Date): boolean {
  return date.getMonth() === 11;
}

export function millisecondsUntilNextLocalDay(date: Date): number {
  const nextLocalDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return nextLocalDay.getTime() - date.getTime();
}
