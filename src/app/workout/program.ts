export interface Exercise {
  readonly name: string;
  readonly emoji: string;
}

export const PREPARATION_MS = 5_000;
export const EXERCISE_MS = 60_000;
export const RECOVERY_MS = 10_000;

export const PROGRAM: readonly Exercise[] = [
  { name: 'Levés de bras + pointes de pieds', emoji: '🙌' },
  { name: 'Balancements de bras de haut en bas', emoji: '💪' },
  { name: 'Rotations du buste', emoji: '🌀' },
  { name: 'Swing de golf', emoji: '🏌️' },
  { name: "Battements d'ailes", emoji: '🦋' },
  { name: 'Montées de genoux', emoji: '🦵' },
  { name: 'Extensions des mollets', emoji: '🩰' },
  { name: 'Fentes latérales avec toucher du pied opposé', emoji: '🦶' },
  { name: "Squats avec battements d'ailes", emoji: '🐥' },
  { name: 'Sautillements', emoji: '🐇' },
];

export const SERIES_TOTAL_MS =
  PREPARATION_MS + PROGRAM.length * EXERCISE_MS + (PROGRAM.length - 1) * RECOVERY_MS;
