import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

interface Point {
  x: number;
  y: number;
}

describe('guided exercise movements in App', () => {
  let fixture: ComponentFixture<App>;
  let el: HTMLElement;
  let callbacks: Map<number, FrameRequestCallback>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  async function exercise(index: number) {
    localStorage.setItem(
      'workout.series',
      JSON.stringify({ phase: 'exercise', index, remainingMs: 30_000 }),
    );
    callbacks = new Map();
    let requestId = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.set(++requestId, callback);
      return requestId;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => callbacks.delete(id));
    vi.spyOn(window.performance, 'now').mockReturnValue(0);
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    el = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.ctrl--main')!.click();
    fixture.detectChanges();
  }

  function frame(time: number) {
    const scheduled = [...callbacks.values()];
    callbacks.clear();
    expect(scheduled.length).toBeGreaterThan(0);
    scheduled.forEach((callback) => callback(time));
    fixture.detectChanges();
  }

  function line(selector: string, index = 0) {
    const element = el.querySelectorAll(`app-exercise-animation ${selector}`)[index];
    expect(element, selector).toBeTruthy();
    return {
      start: {
        x: Number(element.getAttribute('x1')),
        y: Number(element.getAttribute('y1')),
      },
      end: {
        x: Number(element.getAttribute('x2')),
        y: Number(element.getAttribute('y2')),
      },
    };
  }

  function hand(side: number): Point {
    const element = el.querySelectorAll('app-exercise-animation .hand')[side];
    return { x: Number(element.getAttribute('cx')), y: Number(element.getAttribute('cy')) };
  }

  function head(): Point {
    const element = el.querySelector('app-exercise-animation .head')!;
    return { x: Number(element.getAttribute('cx')), y: Number(element.getAttribute('cy')) };
  }

  function alignment(side: 'back' | 'front', limb: 'arm' | 'leg') {
    const index = limb === 'arm' ? 0 : 2;
    const upper = line(`.limb--${side}`, index);
    const lower = line(`.limb--${side}`, index + 1);
    const a = { x: upper.end.x - upper.start.x, y: upper.end.y - upper.start.y };
    const b = { x: lower.end.x - lower.start.x, y: lower.end.y - lower.start.y };
    return (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
  }

  function distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  it('continuously raises the arms and heels while the toes stay on the ground', async () => {
    await exercise(0);
    frame(0);
    const standing = line('.body').start.y;
    const flat = line('.foot--front');
    expect(flat.start.y).toBeCloseTo(flat.end.y);

    frame(1300);
    const raised = line('.foot--front');
    expect(raised.end.y).toBeCloseTo(227);
    expect(raised.start.y).toBeLessThan(raised.end.y - 10);
    expect(line('.body').start.y).toBeLessThan(standing - 10);
    expect(hand(0).y).toBeLessThan(line('.body').end.y - 55);

    frame(2600);
    expect(line('.body').start.y).toBeCloseTo(standing);
    frame(2800);
    expect(line('.body').start.y).toBeLessThan(standing - 0.1);
  });

  it('alternates opposite arms without returning both arms to the bottom', async () => {
    await exercise(1);
    for (let time = 0; time <= 2400; time += 300) {
      frame(time);
      const shoulderY = line('.body').end.y;
      expect(hand(0).y + hand(1).y).toBeCloseTo(2 * shoulderY);
      expect(Math.min(hand(0).y, hand(1).y)).toBeLessThanOrEqual(shoulderY + 0.01);
    }
  });

  it('raises both arms forwards and bends the knees when lowering them', async () => {
    await exercise(0);
    frame(0);
    const loweredHip = line('.body').start.y;
    expect(alignment('front', 'leg')).toBeLessThan(0.6);
    frame(650);
    expect(hand(0).x).toBeGreaterThan(line('.body').end.x + 45);
    expect(hand(1).x).toBeGreaterThan(line('.body').end.x + 45);
    frame(1300);
    expect(line('.body').start.y).toBeLessThan(loweredHip - 20);
  });

  it('swings both alternating arms in front of the torso, not out to the sides', async () => {
    await exercise(1);
    frame(600);
    expect(hand(0).x).toBeGreaterThan(line('.body').end.x + 45);
    expect(hand(1).x).toBeGreaterThan(line('.body').end.x + 45);
  });

  it('holds a deeper squat throughout the torso rotations', async () => {
    await exercise(2);
    for (const time of [0, 750, 1500, 2250]) {
      frame(time);
      expect(line('.body').start.y).toBeGreaterThan(158);
      expect(alignment('back', 'leg')).toBeLessThan(0.5);
      expect(alignment('front', 'leg')).toBeLessThan(0.5);
    }
  });

  it('twists the shoulders and bent arms without leaning the torso', async () => {
    await exercise(2);
    frame(0);
    const body = line('.body');
    const leftward = (hand(0).x + hand(1).x) / 2;
    expect(body.start.x).toBeCloseTo(body.end.x);
    expect(alignment('back', 'arm')).toBeLessThan(0.5);
    expect(alignment('front', 'arm')).toBeLessThan(0.5);
    const turnedWidth = line('.shoulders').end.x - line('.shoulders').start.x;

    frame(750);
    expect(line('.shoulders').end.x - line('.shoulders').start.x).toBeGreaterThan(turnedWidth);
    frame(1500);
    expect(line('.body')).toEqual(body);
    expect((hand(0).x + hand(1).x) / 2).toBeGreaterThan(leftward + 30);
  });

  it('shows the knees and feet with a straight rear leg during the golf swing', async () => {
    await exercise(3);
    for (const time of [0, 2200]) {
      frame(time);
      expect(el.querySelectorAll('app-exercise-animation .knee')).toHaveLength(2);
      expect(line('.foot--back').end.y).toBeCloseTo(227);
      expect(line('.foot--front').end.y).toBeCloseTo(227);
      const legs = [alignment('back', 'leg'), alignment('front', 'leg')];
      expect(Math.max(...legs)).toBeCloseTo(1);
      expect(Math.min(...legs)).toBeLessThan(0.5);
    }
  });

  it('pivots the golf heels from side to side around planted toes', async () => {
    await exercise(3);
    frame(0);
    const toes = [line('.foot--back').end, line('.foot--front').end];
    const heels = [line('.foot--back').start, line('.foot--front').start];
    for (let time = 0; time <= 4400; time += 110) {
      frame(time);
      for (const [index, side] of ['back', 'front'].entries()) {
        const foot = line(`.foot--${side}`);
        expect(foot.end).toEqual(toes[index]);
        if (time === 2200) {
          expect(Math.abs(foot.start.x - heels[index].x)).toBeGreaterThan(15);
        }
        expect(foot.start.y).toBeLessThan(foot.end.y - 3);
        const thigh = line(`.limb--${side}`, 2);
        const shin = line(`.limb--${side}`, 3);
        expect(distance(thigh.start, thigh.end)).toBeCloseTo(43);
        expect(distance(shin.start, shin.end)).toBeCloseTo(39);
      }
    }
  });

  it('takes the wings from alongside the body to fully overhead', async () => {
    await exercise(4);
    frame(0);
    expect(hand(0).y).toBeCloseTo(line('.body').end.y + 60);
    expect(hand(1).y).toBeCloseTo(line('.body').end.y + 60);
    frame(1100);
    expect(hand(0).y).toBeCloseTo(line('.body').end.y - 60);
    expect(hand(1).y).toBeCloseTo(line('.body').end.y - 60);
  });

  it('returns to both feet between forward knee lifts and claps with visible bent arms', async () => {
    await exercise(5);
    for (const time of [0, 1400, 2800]) {
      frame(time);
      expect(line('.foot--back').end.y).toBeCloseTo(227);
      expect(line('.foot--front').end.y).toBeCloseTo(227);
    }
    frame(3500);
    const leftKnee = line('.limb--back', 2).end;
    expect(leftKnee.x).toBeGreaterThan(line('.body').start.x + 40);
    expect(leftKnee.y).toBeCloseTo(line('.body').start.y);
    expect(hand(0).y).toBeLessThan(leftKnee.y);
    expect(distance(hand(0), hand(1))).toBeLessThan(3);
    expect(alignment('back', 'arm')).toBeLessThan(0.9);
    expect(alignment('front', 'arm')).toBeLessThan(0.9);
    expect(distance(line('.limb--back', 0).end, line('.limb--front', 0).end)).toBeGreaterThan(12);
    frame(4900);
    const rightKnee = line('.limb--front', 2).end;
    expect(rightKnee.x).toBeGreaterThan(line('.body').start.x + 40);
    expect(rightKnee.y).toBeCloseTo(line('.body').start.y);
    expect(hand(1).y).toBeLessThan(rightKnee.y);
    expect(line('.foot--back').end.y).toBeCloseTo(227);
  });

  it('starts reaching during the lateral lunge and stays low between sides', async () => {
    await exercise(6);
    frame(0);
    expect(line('.body').start.y).toBeGreaterThan(170);
    frame(600);
    expect(line('.body').end.x).toBeLessThan(line('.body').start.x - 15);
    frame(1200);
    expect(alignment('front', 'leg')).toBeCloseTo(1);
    expect(alignment('back', 'leg')).toBeLessThan(0);
    expect(distance(hand(1), line('.limb--back', 3).end)).toBeLessThan(18);
    const leftLunge = [line('.limb--back', 2), line('.limb--front', 2)];

    frame(1900);
    expect([line('.limb--back', 2), line('.limb--front', 2)]).toEqual(leftLunge);
    expect(distance(hand(1), line('.limb--back', 3).end)).toBeLessThan(4);
    expect(alignment('front', 'arm')).toBeCloseTo(1);
    expect(alignment('back', 'arm')).toBeLessThan(0);
    expect(distance(line('.limb--back', 0).end, head())).toBeGreaterThan(16);
    frame(3000);
    expect(line('.body').start.y).toBeGreaterThan(170);
    frame(4200);
    expect(alignment('back', 'leg')).toBeCloseTo(1);
    expect(alignment('front', 'leg')).toBeLessThan(0);
    expect(distance(hand(0), line('.limb--front', 3).end)).toBeLessThan(18);
    const rightLunge = [line('.limb--back', 2), line('.limb--front', 2)];
    frame(4900);
    expect([line('.limb--back', 2), line('.limb--front', 2)]).toEqual(rightLunge);
    expect(distance(hand(0), line('.limb--front', 3).end)).toBeLessThan(4);
    expect(alignment('back', 'arm')).toBeCloseTo(1);
    expect(alignment('front', 'arm')).toBeLessThan(0);
    expect(distance(line('.limb--front', 0).end, head())).toBeGreaterThan(16);
  });

  it('holds the heels up for two quick punches, returning each fist to guard', async () => {
    await exercise(7);
    frame(0);
    const standing = line('.body').start.y;
    expect(alignment('back', 'arm')).toBeLessThan(0);
    expect(alignment('front', 'arm')).toBeLessThan(0);
    expect(Math.abs(hand(0).y - line('.body').end.y)).toBeLessThan(10);

    frame(400);
    const guard = hand(0);
    expect(line('.body').start.y).toBeLessThan(standing - 10);
    expect(line('.foot--front').end.y).toBeCloseTo(227);
    frame(530);
    expect(alignment('back', 'arm')).toBeCloseTo(1);
    expect(hand(0).x).toBeGreaterThan(guard.x + 25);
    expect(alignment('front', 'arm')).toBeLessThan(0);
    frame(660);
    expect(alignment('back', 'arm')).toBeLessThan(0);
    frame(790);
    expect(alignment('front', 'arm')).toBeCloseTo(1);
    frame(920);
    expect(alignment('front', 'arm')).toBeLessThan(0);
    expect(line('.body').start.y).toBeLessThan(standing - 10);
    frame(1320);
    expect(line('.body').start.y).toBeCloseTo(standing);
  });

  it('finishes the squat wing beat above the head with both feet grounded', async () => {
    await exercise(8);
    frame(1800);
    expect(hand(0).y).toBeLessThan(line('.body').end.y - 45);
    expect(hand(1).y).toBeLessThan(line('.body').end.y - 45);
    expect(line('.foot--back').end.y).toBeCloseTo(227);
    expect(line('.foot--front').end.y).toBeCloseTo(227);
  });

  it('crosses bent forearms inward below and above, opening through the sides', async () => {
    await exercise(8);
    for (const time of [0, 1800]) {
      frame(time);
      expect(hand(0).x).toBeGreaterThan(hand(1).x + 8);
      expect(line('.limb--back', 0).end.x).toBeLessThan(line('.limb--front', 0).end.x);
      expect(alignment('back', 'arm')).toBeLessThan(0.9);
      expect(alignment('front', 'arm')).toBeLessThan(0.9);
      if (time === 0) {
        expect(hand(0).y).toBeGreaterThan(line('.body').end.y + 40);
      } else {
        expect(hand(0).y).toBeLessThan(line('.body').end.y - 45);
      }
    }
    frame(900);
    expect(hand(0).x).toBeLessThan(line('.body').end.x - 60);
    expect(hand(1).x).toBeGreaterThan(line('.body').end.x + 60);
    expect(Math.abs(hand(0).y - line('.body').end.y)).toBeLessThan(5);
  });

  it('shows both feet taking off and landing in a quick hopping loop', async () => {
    await exercise(9);
    frame(0);
    expect(line('.foot--back').end.y).toBeCloseTo(227);
    expect(line('.foot--front').end.y).toBeCloseTo(227);
    frame(180);
    expect(line('.foot--back').end.y).toBeLessThan(212);
    expect(line('.foot--front').end.y).toBeLessThan(212);
    frame(360);
    expect(line('.foot--back').end.y).toBeCloseTo(227);
    expect(line('.foot--front').end.y).toBeCloseTo(227);
    frame(540);
    expect(line('.foot--front').end.y).toBeLessThan(212);
  });
});
