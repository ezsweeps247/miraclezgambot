import { Wave } from './types';

export const WAVES: Wave[] = [
  // Wave 1 - Easy introduction
  {
    enemies: [
      { type: 'basic', count: 5, interval: 1000 }
    ],
    delay: 2000
  },
  
  // Wave 2 - More basics
  {
    enemies: [
      { type: 'basic', count: 8, interval: 800 }
    ],
    delay: 5000
  },
  
  // Wave 3 - Introduction to fast enemies
  {
    enemies: [
      { type: 'basic', count: 5, interval: 1000 },
      { type: 'fast', count: 3, interval: 600 }
    ],
    delay: 5000
  },
  
  // Wave 4 - Mixed wave
  {
    enemies: [
      { type: 'fast', count: 5, interval: 500 },
      { type: 'basic', count: 10, interval: 700 }
    ],
    delay: 5000
  },
  
  // Wave 5 - First tank
  {
    enemies: [
      { type: 'basic', count: 10, interval: 600 },
      { type: 'tank', count: 1, interval: 0 },
      { type: 'fast', count: 5, interval: 400 }
    ],
    delay: 6000
  },
  
  // Wave 6 - Harder mix
  {
    enemies: [
      { type: 'fast', count: 8, interval: 400 },
      { type: 'tank', count: 2, interval: 2000 },
      { type: 'basic', count: 15, interval: 500 }
    ],
    delay: 6000
  },
  
  // Wave 7 - Tank rush
  {
    enemies: [
      { type: 'tank', count: 3, interval: 1500 },
      { type: 'basic', count: 20, interval: 400 },
      { type: 'fast', count: 10, interval: 300 }
    ],
    delay: 7000
  },
  
  // Wave 8 - Speed wave
  {
    enemies: [
      { type: 'fast', count: 20, interval: 300 },
      { type: 'basic', count: 15, interval: 400 },
      { type: 'tank', count: 2, interval: 2000 }
    ],
    delay: 7000
  },
  
  // Wave 9 - Pre-boss wave
  {
    enemies: [
      { type: 'tank', count: 5, interval: 1000 },
      { type: 'fast', count: 15, interval: 300 },
      { type: 'basic', count: 25, interval: 350 }
    ],
    delay: 8000
  },
  
  // Wave 10 - Boss wave
  {
    enemies: [
      { type: 'basic', count: 10, interval: 400 },
      { type: 'boss', count: 1, interval: 0 },
      { type: 'fast', count: 10, interval: 300 },
      { type: 'tank', count: 3, interval: 1500 }
    ],
    delay: 10000
  },
  
  // Endless waves after 10 - progressively harder
  {
    enemies: [
      { type: 'basic', count: 30, interval: 300 },
      { type: 'fast', count: 20, interval: 250 },
      { type: 'tank', count: 8, interval: 800 },
      { type: 'boss', count: 2, interval: 5000 }
    ],
    delay: 10000
  }
];

export class WaveManager {
  private currentWave: number = 0;
  private enemiesSpawned: number = 0;
  private enemiesInWave: number = 0;
  private waveInProgress: boolean = false;
  private lastSpawnTime: number = 0;
  private currentEnemyIndex: number = 0;
  private waveStartTime: number = 0;
  
  constructor() {
    this.reset();
  }
  
  reset() {
    this.currentWave = 0;
    this.enemiesSpawned = 0;
    this.enemiesInWave = 0;
    this.waveInProgress = false;
    this.lastSpawnTime = 0;
    this.currentEnemyIndex = 0;
    this.waveStartTime = 0;
  }
  
  resetTiming() {
    // Reset timing variables for consistent spawning
    this.lastSpawnTime = 0;
    this.waveStartTime = Date.now();
  }
  
  startWave(waveNumber: number) {
    this.currentWave = waveNumber;
    this.enemiesSpawned = 0;
    this.currentEnemyIndex = 0;
    this.waveInProgress = true;
    this.waveStartTime = Date.now();
    
    const wave = this.getWaveData(waveNumber);
    this.enemiesInWave = wave.enemies.reduce((total, group) => total + group.count, 0);
  }
  
  getWaveData(waveNumber: number): Wave {
    if (waveNumber <= 0) return WAVES[0];
    if (waveNumber <= WAVES.length) return WAVES[waveNumber - 1];
    
    // For waves beyond defined ones, generate progressively harder waves
    const baseWave = WAVES[WAVES.length - 1];
    const multiplier = 1 + (waveNumber - WAVES.length) * 0.2;
    
    return {
      enemies: baseWave.enemies.map(group => ({
        ...group,
        count: Math.floor(group.count * multiplier)
      })),
      delay: baseWave.delay
    };
  }
  
  update(time: number, spawnEnemy: (type: string) => void) {
    if (!this.waveInProgress) return;
    
    const wave = this.getWaveData(this.currentWave);
    
    // Check if we've spawned all enemies
    if (this.enemiesSpawned >= this.enemiesInWave) {
      this.waveInProgress = false;
      return;
    }
    
    // Wait for initial delay
    if (time - this.waveStartTime < wave.delay) {
      return;
    }
    
    // Spawn enemies from current group
    let enemiesSpawnedThisFrame = 0;
    
    for (let i = 0; i < wave.enemies.length; i++) {
      const group = wave.enemies[i];
      let groupStartIndex = 0;
      
      // Calculate the starting index for this group
      for (let j = 0; j < i; j++) {
        groupStartIndex += wave.enemies[j].count;
      }
      
      // Check if we're currently spawning from this group
      if (this.enemiesSpawned >= groupStartIndex && 
          this.enemiesSpawned < groupStartIndex + group.count) {
        
        // Check spawn interval
        const timeSinceLastSpawn = time - this.lastSpawnTime;
        if (timeSinceLastSpawn >= group.interval || group.interval === 0) {
          spawnEnemy(group.type);
          this.enemiesSpawned++;
          this.lastSpawnTime = time;
          enemiesSpawnedThisFrame++;
          
          // Only spawn one enemy per frame
          if (enemiesSpawnedThisFrame > 0) break;
        }
      }
    }
  }
  
  isWaveComplete(): boolean {
    return !this.waveInProgress && this.enemiesSpawned >= this.enemiesInWave;
  }
  
  getCurrentWave(): number {
    return this.currentWave;
  }
  
  getEnemiesRemaining(): number {
    return this.enemiesInWave - this.enemiesSpawned;
  }
  
  getWaveProgress(): number {
    if (this.enemiesInWave === 0) return 0;
    return this.enemiesSpawned / this.enemiesInWave;
  }
}