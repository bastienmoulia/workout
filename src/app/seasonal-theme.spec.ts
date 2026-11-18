import { isChristmasSeason, millisecondsUntilNextLocalDay } from './seasonal-theme';

describe('seasonal theme', () => {
  it('is active on local dates in December every year', () => {
    expect(isChristmasSeason(new Date(2026, 11, 1))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 11, 31))).toBe(true);
  });

  it('is inactive outside December', () => {
    expect(isChristmasSeason(new Date(2026, 10, 30, 23, 59))).toBe(false);
    expect(isChristmasSeason(new Date(2027, 0, 1))).toBe(false);
  });

  it('calculates the next local midnight across month boundaries', () => {
    expect(millisecondsUntilNextLocalDay(new Date(2026, 11, 31, 23, 59, 30))).toBe(30_000);
    const newYear = new Date(2027, 0, 1);
    const followingDay = new Date(2027, 0, 2);
    expect(millisecondsUntilNextLocalDay(newYear)).toBe(followingDay.getTime() - newYear.getTime());
  });
});
