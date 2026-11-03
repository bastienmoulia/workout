import { PROGRAM } from './program';
import { gestureFor } from './gestures';

describe('exercise gesture definitions', () => {
  it('provides a described, multi-pose loop for every programmed exercise', () => {
    for (const exercise of PROGRAM) {
      const gesture = gestureFor(exercise.name);
      expect(gesture).toBeDefined();
      expect(gesture?.description.length).toBeGreaterThan(0);
      expect(gesture?.poses.length).toBeGreaterThanOrEqual(2);
      expect(gesture?.durationMs).toBeGreaterThan(0);
      expect(gesture?.reducedMotionPose).toBeLessThan(gesture?.poses.length ?? 0);
    }
    expect(PROGRAM.some(({ name }) => (gestureFor(name)?.durationMs ?? 0) > 5000)).toBe(true);
  });
});
