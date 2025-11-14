// Type definitions for Tower Defense game

export interface Enemy {
  sprite: Phaser.GameObjects.Sprite;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  type: string;
  healthBar?: Phaser.GameObjects.Graphics;
  path: Phaser.Curves.Path;
  pathT: number;
  isDead: boolean;
}

export interface Tower {
  sprite: Phaser.GameObjects.Sprite;
  type: string;
  damage: number;
  fireRate: number;
  range: number;
  cost: number;
  lastFired: number;
  level: number;
  rangeCircle?: Phaser.GameObjects.Graphics;
}

export interface Bullet {
  sprite: Phaser.GameObjects.Sprite;
  damage: number;
  target: Enemy;
  speed: number;
}

export interface Wave {
  enemies: EnemySpawn[];
  delay: number;
}

export interface EnemySpawn {
  type: string;
  count: number;
  interval: number;
}

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  gameOver: boolean;
  selectedTowerType: keyof typeof TOWER_TYPES | null;
  score: number;
}

export const ENEMY_TYPES = {
  BASIC: {
    health: 100,
    speed: 35,  // Reduced from 60 for better balance
    reward: 10,
    color: 0xff0000,
    name: 'basic'
  },
  FAST: {
    health: 75,
    speed: 55,  // Reduced from 100 for better balance
    reward: 15,
    color: 0xff00ff,
    name: 'fast'
  },
  TANK: {
    health: 300,
    speed: 25,  // Reduced from 40 for better balance
    reward: 30,
    color: 0x8b0000,
    name: 'tank'
  },
  BOSS: {
    health: 1000,
    speed: 20,  // Reduced from 30 for better balance
    reward: 100,
    color: 0x4b0082,
    name: 'boss'
  }
};

export const TOWER_TYPES = {
  BASIC: {
    damage: 20,
    fireRate: 1000,
    range: 100,
    cost: 50,
    color: 0x00ff00,
    name: 'basic'
  },
  SNIPER: {
    damage: 80,
    fireRate: 2000,
    range: 200,
    cost: 100,
    color: 0x0000ff,
    name: 'sniper'
  },
  CANNON: {
    damage: 50,
    fireRate: 1500,
    range: 80,
    cost: 150,
    color: 0xffff00,
    name: 'cannon'
  },
  LASER: {
    damage: 10,
    fireRate: 100,
    range: 120,
    cost: 200,
    color: 0x00ffff,
    name: 'laser'
  }
};