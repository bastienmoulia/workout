import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { GestureDefinition, PoseAngles } from './gestures';

interface Point {
  readonly x: number;
  readonly y: number;
}

const STANDING_HIP_Y = 145;
const GROUND_Y = 227;
const UPPER_LEG_LENGTH = 43;
const LOWER_LEG_LENGTH = 39;

@Component({
  selector: 'app-exercise-animation',
  template: `
    <div class="animation" [class.animation--rest]="rest()" [class.animation--reduced]="reduced()">
      <svg
        viewBox="0 0 240 240"
        [class.profile]="definition()?.view === 'profil'"
        aria-hidden="true"
      >
        <line class="ground" x1="30" y1="229" x2="210" y2="229" />
        <line
          class="body"
          [attr.x1]="figure().hip.x"
          [attr.y1]="figure().hip.y"
          [attr.x2]="figure().shoulder.x"
          [attr.y2]="figure().shoulder.y"
        />
        <line
          class="shoulders"
          [attr.x1]="figure().shoulderLeft.x"
          [attr.y1]="figure().shoulderLeft.y"
          [attr.x2]="figure().shoulderRight.x"
          [attr.y2]="figure().shoulderRight.y"
        />
        <line
          class="limb limb--back"
          [attr.x1]="figure().shoulderLeft.x"
          [attr.y1]="figure().shoulderLeft.y"
          [attr.x2]="figure().elbowLeft.x"
          [attr.y2]="figure().elbowLeft.y"
        />
        <line
          class="limb limb--back"
          [attr.x1]="figure().elbowLeft.x"
          [attr.y1]="figure().elbowLeft.y"
          [attr.x2]="figure().handLeft.x"
          [attr.y2]="figure().handLeft.y"
        />
        <line
          class="limb limb--front"
          [attr.x1]="figure().shoulderRight.x"
          [attr.y1]="figure().shoulderRight.y"
          [attr.x2]="figure().elbowRight.x"
          [attr.y2]="figure().elbowRight.y"
        />
        <line
          class="limb limb--front"
          [attr.x1]="figure().elbowRight.x"
          [attr.y1]="figure().elbowRight.y"
          [attr.x2]="figure().handRight.x"
          [attr.y2]="figure().handRight.y"
        />
        <line
          class="limb limb--back"
          [attr.x1]="figure().hipLeft.x"
          [attr.y1]="figure().hip.y"
          [attr.x2]="figure().kneeLeft.x"
          [attr.y2]="figure().kneeLeft.y"
        />
        <line
          class="limb limb--back"
          [attr.x1]="figure().kneeLeft.x"
          [attr.y1]="figure().kneeLeft.y"
          [attr.x2]="figure().footLeft.x"
          [attr.y2]="figure().footLeft.y"
        />
        <line
          class="limb limb--front"
          [attr.x1]="figure().hipRight.x"
          [attr.y1]="figure().hip.y"
          [attr.x2]="figure().kneeRight.x"
          [attr.y2]="figure().kneeRight.y"
        />
        <line
          class="limb limb--front"
          [attr.x1]="figure().kneeRight.x"
          [attr.y1]="figure().kneeRight.y"
          [attr.x2]="figure().footRight.x"
          [attr.y2]="figure().footRight.y"
        />
        <line
          class="foot foot--back"
          [attr.x1]="figure().heelLeft.x"
          [attr.y1]="figure().heelLeft.y"
          [attr.x2]="figure().toeLeft.x"
          [attr.y2]="figure().toeLeft.y"
        />
        <line
          class="foot foot--front"
          [attr.x1]="figure().heelRight.x"
          [attr.y1]="figure().heelRight.y"
          [attr.x2]="figure().toeRight.x"
          [attr.y2]="figure().toeRight.y"
        />
        <circle
          class="knee knee--back"
          [attr.cx]="figure().kneeLeft.x"
          [attr.cy]="figure().kneeLeft.y"
          r="3.5"
        />
        <circle
          class="knee"
          [attr.cx]="figure().kneeRight.x"
          [attr.cy]="figure().kneeRight.y"
          r="3.5"
        />
        <circle class="head" [attr.cx]="figure().head.x" [attr.cy]="figure().head.y" r="13" />
        <circle
          class="hand"
          [attr.cx]="figure().handLeft.x"
          [attr.cy]="figure().handLeft.y"
          r="3"
        />
        <circle
          class="hand"
          [attr.cx]="figure().handRight.x"
          [attr.cy]="figure().handRight.y"
          r="3"
        />
      </svg>
      @if (!rest() && definition(); as gesture) {
        <span class="gesture-description" [class.sr-only]="!reduced()">
          {{ gesture.description }}
        </span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .animation,
    svg {
      width: 100%;
      height: 100%;
    }

    svg {
      overflow: visible;
    }

    .body,
    .shoulders,
    .limb,
    .foot,
    .ground {
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 5;
    }

    .head {
      fill: none;
      stroke: currentColor;
      stroke-width: 5;
    }

    .ground {
      opacity: 0.2;
      stroke-width: 2;
    }

    .profile .limb--back,
    .profile .foot--back,
    .profile .knee--back {
      opacity: 0.6;
    }

    .profile .limb--front {
      stroke-width: 6;
    }

    .hand {
      fill: var(--accent);
    }

    .knee {
      fill: currentColor;
    }

    .animation--rest {
      color: rgb(255 255 255 / 0.62);
    }

    .animation--reduced .hand {
      fill: currentColor;
    }

    .animation--reduced .gesture-description {
      position: absolute;
      right: -0.5rem;
      bottom: 0;
      left: -0.5rem;
      width: auto;
      height: auto;
      margin: 0;
      padding: 0.3rem;
      overflow: visible;
      clip: auto;
      border-radius: 0.4rem;
      background: rgb(25 8 52 / 0.86);
      font-size: 0.63rem;
      line-height: 1.15;
      white-space: normal;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class ExerciseAnimation {
  readonly definition = input<GestureDefinition>();
  readonly paused = input(false);
  readonly rest = input(false);

  protected readonly reduced = signal(false);
  private readonly frameTime = signal(0);
  private elapsedMs = 0;
  private lastDefinition?: GestureDefinition;

  protected readonly pose = computed(() => {
    const definition = this.definition();
    if (!definition) return null;
    if (this.reduced()) return definition.poses[definition.reducedMotionPose].angles;
    return interpolatePose(definition, this.frameTime());
  });

  protected readonly figure = computed(() =>
    makeFigure(
      this.pose(),
      this.rest(),
      this.definition()?.view === 'profil',
      this.definition()?.groundSupport ?? false,
      this.definition()?.profileSpacing ?? 0,
      this.definition()?.pivotFeet ?? false,
    ),
  );

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const motionPreference = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motionPreference) {
      this.reduced.set(motionPreference.matches);
      const onChange = (event: MediaQueryListEvent) => this.reduced.set(event.matches);
      motionPreference.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => motionPreference.removeEventListener('change', onChange));
    }

    effect((onCleanup) => {
      const definition = this.definition();
      const paused = this.paused() || this.reduced() || this.rest();
      if (definition !== this.lastDefinition) {
        this.lastDefinition = definition;
        this.elapsedMs = 0;
        this.frameTime.set(0);
      }
      if (!definition || paused || !view) return;

      const startedAt = view.performance.now() - this.elapsedMs;
      let requestId = 0;
      const animate = (now: number) => {
        this.elapsedMs = now - startedAt;
        this.frameTime.set(this.elapsedMs % definition.durationMs);
        requestId = view.requestAnimationFrame(animate);
      };
      requestId = view.requestAnimationFrame(animate);
      onCleanup(() => view.cancelAnimationFrame(requestId));
    });
  }
}

function interpolatePose(definition: GestureDefinition, time: number): PoseAngles {
  const poses = definition.poses;
  let elapsed = time % definition.durationMs;
  let fromIndex = 0;
  while (fromIndex < poses.length - 1 && elapsed >= poses[fromIndex].durationMs) {
    elapsed -= poses[fromIndex].durationMs;
    fromIndex++;
  }
  const from = poses[fromIndex];
  const to = poses[(fromIndex + 1) % poses.length];
  const progress = elapsed / from.durationMs;
  const eased = progress * progress * (3 - 2 * progress);
  return Object.fromEntries(
    Object.keys(from.angles).map((key) => {
      const angle = key as keyof PoseAngles;
      return [angle, from.angles[angle] + (to.angles[angle] - from.angles[angle]) * eased];
    }),
  ) as PoseAngles;
}

function makeFigure(
  pose: PoseAngles | null,
  rest: boolean,
  profile: boolean,
  groundSupport: boolean,
  profileSpacing: number,
  pivotFeet: boolean,
) {
  const neutral: PoseAngles = {
    brasGauche: -18,
    brasDroit: 18,
    coudeGauche: 0,
    coudeDroit: 0,
    jambeGauche: -6,
    jambeDroite: 6,
    genouGauche: 0,
    genouDroit: 0,
    buste: 0,
    pointes: 0,
    saut: 0,
    rotation: 0,
    bassinLateral: 0,
  };
  const values = rest || !pose ? neutral : pose;
  const rotation = (values.rotation * Math.PI) / 180;
  const pivoting = pivotFeet && !rest && pose !== null;
  const plantedFoot = (x: number) => {
    const toe = { x, y: GROUND_Y };
    const heel = {
      x: x + Math.sin(rotation) * 16,
      y: GROUND_Y - Math.cos(rotation) * 8,
    };
    const ankle = { x: heel.x * 0.75 + toe.x * 0.25, y: heel.y };
    return { toe, heel, ankle };
  };
  const plantedLeft = plantedFoot(70);
  const plantedRight = plantedFoot(170);
  const hipX = 120 + values.bassinLateral;
  const hipY = pivoting
    ? Math.max(
        supportedHipY(hipX - 5, plantedLeft.ankle),
        supportedHipY(hipX + 5, plantedRight.ankle),
      )
    : groundSupport && !rest
      ? GROUND_Y -
        Math.max(
          legVerticalReach(values.jambeGauche, values.genouGauche),
          legVerticalReach(values.jambeDroite, values.genouDroit),
        )
      : STANDING_HIP_Y;
  const hip = {
    x: hipX,
    y: hipY - values.pointes - values.saut,
  };
  const torsoRadians = (values.buste * Math.PI) / 180;
  const shoulder = {
    x: hip.x + Math.sin(torsoRadians) * (profile ? 16 : 48),
    y: hip.y - Math.cos(torsoRadians) * 48,
  };
  const head = { x: shoulder.x, y: shoulder.y - 27 };
  const shoulderLeft = { x: shoulder.x - (profile ? profileSpacing : 18), y: shoulder.y };
  const shoulderRight = { x: shoulder.x + (profile ? profileSpacing : 18), y: shoulder.y };
  const elbowLeft = fromAngle(shoulderLeft, values.brasGauche, 31);
  const handLeft = fromAngle(elbowLeft, values.brasGauche + values.coudeGauche, 29);
  const elbowRight = fromAngle(shoulderRight, values.brasDroit, 31);
  const handRight = fromAngle(elbowRight, values.brasDroit + values.coudeDroit, 29);
  const hipLeft = { x: hip.x - (profile ? 1 : 5), y: hip.y };
  const hipRight = { x: hip.x + (profile ? 1 : 5), y: hip.y };
  const kneeLeft = pivoting
    ? supportedKnee(hipLeft, plantedLeft.ankle, -1)
    : fromAngle(hipLeft, values.jambeGauche, UPPER_LEG_LENGTH);
  const kneeRight = pivoting
    ? supportedKnee(hipRight, plantedRight.ankle, 1)
    : fromAngle(hipRight, values.jambeDroite, UPPER_LEG_LENGTH);
  const footLeft = pivoting
    ? plantedLeft.ankle
    : fromAngle(kneeLeft, values.jambeGauche + values.genouGauche, LOWER_LEG_LENGTH);
  const footRight = pivoting
    ? plantedRight.ankle
    : fromAngle(kneeRight, values.jambeDroite + values.genouDroit, LOWER_LEG_LENGTH);
  const leftDirection = profile ? 1 : -1;
  const turn = (point: Point, depth: number): Point => ({
    x: shoulder.x + (point.x - shoulder.x) * Math.cos(rotation) + depth * Math.sin(rotation),
    y: point.y,
  });
  const handDepth = (elbow: number) => 10 + Math.abs(Math.sin((elbow * Math.PI) / 180)) * 29;
  return {
    hip,
    shoulder,
    shoulderLeft: turn(shoulderLeft, 0),
    shoulderRight: turn(shoulderRight, 0),
    head,
    elbowLeft: turn(elbowLeft, 10),
    handLeft: turn(handLeft, handDepth(values.coudeGauche)),
    elbowRight: turn(elbowRight, 10),
    handRight: turn(handRight, handDepth(values.coudeDroit)),
    kneeLeft,
    kneeRight,
    hipLeft,
    hipRight,
    footLeft,
    footRight,
    heelLeft: pivoting ? plantedLeft.heel : { x: footLeft.x - leftDirection * 4, y: footLeft.y },
    toeLeft: pivoting
      ? plantedLeft.toe
      : { x: footLeft.x + leftDirection * 12, y: footLeft.y + values.pointes },
    heelRight: pivoting ? plantedRight.heel : { x: footRight.x - 4, y: footRight.y },
    toeRight: pivoting
      ? plantedRight.toe
      : { x: footRight.x + 12, y: footRight.y + values.pointes },
  };
}

function supportedHipY(hipX: number, ankle: Point): number {
  const reach = UPPER_LEG_LENGTH + LOWER_LEG_LENGTH;
  return ankle.y - Math.sqrt(reach * reach - (ankle.x - hipX) ** 2);
}

function supportedKnee(hip: Point, ankle: Point, side: number): Point {
  const dx = ankle.x - hip.x;
  const dy = ankle.y - hip.y;
  const distance = Math.hypot(dx, dy);
  const along = (UPPER_LEG_LENGTH ** 2 - LOWER_LEG_LENGTH ** 2 + distance ** 2) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, UPPER_LEG_LENGTH ** 2 - along ** 2));
  return {
    x: hip.x + (along * dx + side * bend * dy) / distance,
    y: hip.y + (along * dy - side * bend * dx) / distance,
  };
}

function legVerticalReach(legAngle: number, kneeAngle: number): number {
  const radians = Math.PI / 180;
  return (
    Math.cos(legAngle * radians) * UPPER_LEG_LENGTH +
    Math.cos((legAngle + kneeAngle) * radians) * LOWER_LEG_LENGTH
  );
}

function fromAngle(origin: Point, angle: number, length: number): Point {
  const radians = (angle * Math.PI) / 180;
  return {
    x: origin.x + Math.sin(radians) * length,
    y: origin.y + Math.cos(radians) * length,
  };
}
