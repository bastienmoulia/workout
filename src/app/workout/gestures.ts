import { PROGRAM } from './program';
import gestureData from './gestures.json';

const ANGLE_KEYS = [
  'brasGauche',
  'brasDroit',
  'coudeGauche',
  'coudeDroit',
  'jambeGauche',
  'jambeDroite',
  'genouGauche',
  'genouDroit',
  'buste',
  'pointes',
  'saut',
] as const;

export type PoseAngles = Readonly<Record<(typeof ANGLE_KEYS)[number], number>>;

export interface GesturePose {
  readonly angles: PoseAngles;
  readonly durationMs: number;
}

export interface GestureDefinition {
  readonly exercise: string;
  readonly view: 'face' | 'profil';
  readonly description: string;
  readonly reducedMotionPose: number;
  readonly poses: readonly GesturePose[];
  readonly durationMs: number;
}

const DEFINITIONS = loadDefinitions(gestureData);

export function gestureFor(exercise: string): GestureDefinition | undefined {
  return DEFINITIONS.get(exercise);
}

function loadDefinitions(data: unknown): ReadonlyMap<string, GestureDefinition> {
  const definitions = new Map<string, GestureDefinition>();
  if (!isRecord(data) || data['schemaVersion'] !== 1 || !isRecord(data['positions'])) {
    console.error('[gestures.json] Le document doit contenir schemaVersion: 1 et positions.');
    return definitions;
  }

  const positionsData = data['positions'];
  const namedPositions = new Map<string, PoseAngles>();
  for (const [name, position] of Object.entries(positionsData)) {
    if (!isAngleRecord(position)) {
      console.error(`[gestures.json] La position nommée « ${name} » est invalide.`);
      continue;
    }
    namedPositions.set(name, { ...position } as PoseAngles);
  }
  if (!namedPositions.has('neutre')) {
    console.error('[gestures.json] La position nommée « neutre » est obligatoire.');
    return definitions;
  }

  const animations = data['animations'];
  if (!Array.isArray(animations)) {
    console.error('[gestures.json] Le champ animations doit être une liste.');
    return definitions;
  }

  const exercises = new Set(PROGRAM.map(({ name }) => name));
  const declaredExercises = new Set<string>();
  const duplicateExercises = new Set<string>();
  for (const item of animations) {
    if (isRecord(item) && typeof item['exercice'] === 'string') {
      const name = item['exercice'];
      if (declaredExercises.has(name)) {
        console.error(`[gestures.json] Définition en double pour « ${name} ».`);
        duplicateExercises.add(name);
        definitions.delete(name);
        continue;
      }
      declaredExercises.add(name);
    }

    const parsed = parseDefinition(item, namedPositions);
    if (!parsed) continue;
    if (duplicateExercises.has(parsed.exercise)) continue;
    if (!exercises.has(parsed.exercise)) {
      console.error(
        `[gestures.json] « ${parsed.exercise} » ne correspond à aucun exercice du programme.`,
      );
      continue;
    }
    definitions.set(parsed.exercise, parsed);
  }

  for (const exercise of exercises) {
    if (!definitions.has(exercise)) {
      console.error(`[gestures.json] Animation absente ou invalide pour « ${exercise} ».`);
    }
  }
  return definitions;
}

function parseDefinition(
  value: unknown,
  namedPositions: ReadonlyMap<string, PoseAngles>,
): GestureDefinition | undefined {
  if (!isRecord(value)) {
    console.error('[gestures.json] Une définition d’exercice est incomplète ou mal formée.');
    return undefined;
  }
  const exercise = value['exercice'];
  const view = value['vue'];
  const description = value['description'];
  const reducedMotionPose = value['poseReduite'];
  const rawPoses = value['poses'];
  if (
    typeof exercise !== 'string' ||
    (view !== 'face' && view !== 'profil') ||
    typeof description !== 'string' ||
    description.trim().length === 0 ||
    typeof reducedMotionPose !== 'number' ||
    !Number.isInteger(reducedMotionPose) ||
    !Array.isArray(rawPoses) ||
    rawPoses.length < 2
  ) {
    console.error('[gestures.json] Une définition d’exercice est incomplète ou mal formée.');
    return undefined;
  }

  const poses: GesturePose[] = [];
  for (const item of rawPoses) {
    if (!isRecord(item)) {
      console.error(`[gestures.json] Durée ou pose invalide pour « ${exercise} ».`);
      return undefined;
    }
    const durationMs = item['dureeMs'];
    const positionValue = item['position'];
    if (
      typeof durationMs !== 'number' ||
      !Number.isInteger(durationMs) ||
      durationMs <= 0 ||
      (positionValue !== undefined && typeof positionValue !== 'string')
    ) {
      console.error(`[gestures.json] Durée ou pose invalide pour « ${exercise} ».`);
      return undefined;
    }
    const positionName = typeof positionValue === 'string' ? positionValue : 'neutre';
    const base = namedPositions.get(positionName);
    const overrides = Object.fromEntries(
      Object.entries(item).filter(([key]) => key !== 'position' && key !== 'dureeMs'),
    );
    if (!base || !isAngleOverrides(overrides)) {
      console.error(
        `[gestures.json] Position ou angle invalide pour « ${exercise} » (${positionName}).`,
      );
      return undefined;
    }
    poses.push({
      angles: { ...base, ...overrides } as PoseAngles,
      durationMs,
    });
  }

  if (reducedMotionPose < 0 || reducedMotionPose >= poses.length) {
    console.error(`[gestures.json] Pose réduite invalide pour « ${exercise} ».`);
    return undefined;
  }
  return {
    exercise,
    view,
    description,
    reducedMotionPose,
    poses,
    durationMs: poses.reduce((total, pose) => total + pose.durationMs, 0),
  };
}

function isAngleRecord(value: unknown): value is Record<string, number> {
  if (!isRecord(value) || ANGLE_KEYS.some((key) => typeof value[key] !== 'number')) return false;
  return isAngleOverrides(value);
}

function isAngleOverrides(value: Record<string, unknown>): value is Record<string, number> {
  return Object.entries(value).every(
    ([key, angle]) =>
      ANGLE_KEYS.includes(key as (typeof ANGLE_KEYS)[number]) &&
      typeof angle === 'number' &&
      Number.isFinite(angle) &&
      Math.abs(angle) <= 180,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
