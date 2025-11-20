
export enum GameState {
  MENU = 'MENU',
  INTRO = 'INTRO',
  BRIEFING = 'BRIEFING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type CombatState = 'IDLE' | 'MOVING' | 'ATTACKING' | 'BLOCKING' | 'STUNNED' | 'HIT';

export interface Duelist {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 1 | -1; // 1 right, -1 left
  color: string;
  saberColor: string;
  health: number;
  maxHealth: number;
  force: number; // Stamina/Mana
  maxForce: number;
  state: CombatState;
  stateTimer: number; // How long within this state
  velocity: { x: number; y: number };
  isPlayer: boolean;
  aiCooldown: number; // Time until AI can react/act effectively again
  attackVariant: number; // 0, 1, 2 for different swings
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  width: number;
}

export interface MissionData {
  title: string;
  enemyName: string;
  taunt: string;
  difficulty: '学徒' | '武士' | '大师';
}
