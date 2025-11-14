import Phaser from 'phaser';
import { Enemy, ENEMY_TYPES } from './types';

export class EnemyManager {
  private scene: Phaser.Scene;
  private enemies: Enemy[] = [];
  private path: Phaser.Curves.Path;
  private onEnemyReachEnd: (enemy: Enemy) => void;
  private onEnemyKilled: (enemy: Enemy) => void;

  constructor(
    scene: Phaser.Scene,
    onEnemyReachEnd: (enemy: Enemy) => void,
    onEnemyKilled: (enemy: Enemy) => void
  ) {
    this.scene = scene;
    this.onEnemyReachEnd = onEnemyReachEnd;
    this.onEnemyKilled = onEnemyKilled;
    
    // Scale path coordinates based on game dimensions
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const scaleX = gameWidth / 800;
    const scaleY = gameHeight / 600;
    
    // Create the path enemies will follow with scaled coordinates
    this.path = new Phaser.Curves.Path(50 * scaleX, 300 * scaleY);
    this.path.lineTo(200 * scaleX, 300 * scaleY);
    this.path.lineTo(200 * scaleX, 150 * scaleY);
    this.path.lineTo(400 * scaleX, 150 * scaleY);
    this.path.lineTo(400 * scaleX, 450 * scaleY);
    this.path.lineTo(600 * scaleX, 450 * scaleY);
    this.path.lineTo(600 * scaleX, 300 * scaleY);
    this.path.lineTo(750 * scaleX, 300 * scaleY);
  }

  spawnEnemy(type: string) {
    const enemyType = ENEMY_TYPES[type.toUpperCase()] || ENEMY_TYPES.BASIC;
    
    // Get starting position from the path (scaled)
    const startPoint = this.path.getPoint(0);
    
    // Create enemy sprite at the scaled start position
    const sprite = this.scene.add.sprite(startPoint.x, startPoint.y, null);
    
    // Create a simple colored circle for the enemy
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(enemyType.color, 1);
    graphics.fillCircle(0, 0, 12);
    graphics.generateTexture(`enemy_${type}`, 24, 24);
    graphics.destroy();
    
    sprite.setTexture(`enemy_${type}`);
    sprite.setDepth(2);
    
    // Create health bar
    const healthBar = this.scene.add.graphics();
    healthBar.setDepth(3);
    
    const enemy: Enemy = {
      sprite,
      health: enemyType.health,
      maxHealth: enemyType.health,
      speed: enemyType.speed,
      reward: enemyType.reward,
      type: enemyType.name,
      healthBar,
      path: this.path,
      pathT: 0,
      isDead: false
    };
    
    this.enemies.push(enemy);
    this.updateHealthBar(enemy);
    
    return enemy;
  }

  update(delta: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      
      if (enemy.isDead) {
        continue;
      }
      
      // Move enemy along path
      enemy.pathT += (enemy.speed * delta) / 100000;
      
      if (enemy.pathT >= 1) {
        // Enemy reached the end
        this.onEnemyReachEnd(enemy);
        this.removeEnemy(enemy, i);
      } else {
        // Update enemy position
        const point = enemy.path.getPoint(enemy.pathT);
        enemy.sprite.x = point.x;
        enemy.sprite.y = point.y;
        
        // Update health bar position
        if (enemy.healthBar) {
          enemy.healthBar.clear();
          this.updateHealthBar(enemy);
        }
        
        // Face direction of movement
        if (enemy.pathT > 0) {
          const nextPoint = enemy.path.getPoint(Math.min(enemy.pathT + 0.01, 1));
          const angle = Phaser.Math.Angle.Between(
            enemy.sprite.x,
            enemy.sprite.y,
            nextPoint.x,
            nextPoint.y
          );
          enemy.sprite.rotation = angle;
        }
      }
    }
  }

  damageEnemy(enemy: Enemy, damage: number) {
    if (enemy.isDead) return;
    
    enemy.health -= damage;
    
    if (enemy.health <= 0) {
      enemy.isDead = true;
      this.onEnemyKilled(enemy);
      
      // Create death effect
      const deathEffect = this.scene.add.graphics();
      deathEffect.fillStyle(0xffff00, 1);
      deathEffect.fillCircle(enemy.sprite.x, enemy.sprite.y, 15);
      deathEffect.setAlpha(0.8);
      
      this.scene.tweens.add({
        targets: deathEffect,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => deathEffect.destroy()
      });
      
      const index = this.enemies.indexOf(enemy);
      if (index > -1) {
        this.removeEnemy(enemy, index);
      }
    } else {
      this.updateHealthBar(enemy);
      
      // Flash red when hit
      this.scene.tweens.add({
        targets: enemy.sprite,
        tint: 0xff0000,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          enemy.sprite.clearTint();
        }
      });
    }
  }

  private updateHealthBar(enemy: Enemy) {
    if (!enemy.healthBar) return;
    
    enemy.healthBar.clear();
    
    const barWidth = 30;
    const barHeight = 4;
    const x = enemy.sprite.x - barWidth / 2;
    const y = enemy.sprite.y - 20;
    
    // Background
    enemy.healthBar.fillStyle(0x000000, 0.5);
    enemy.healthBar.fillRect(x, y, barWidth, barHeight);
    
    // Health
    const healthPercent = enemy.health / enemy.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00ff00 : 
                       healthPercent > 0.25 ? 0xffff00 : 0xff0000;
    enemy.healthBar.fillStyle(healthColor, 1);
    enemy.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
  }

  private removeEnemy(enemy: Enemy, index: number) {
    enemy.sprite.destroy();
    if (enemy.healthBar) {
      enemy.healthBar.destroy();
    }
    this.enemies.splice(index, 1);
  }

  getEnemies() {
    return this.enemies.filter(e => !e.isDead);
  }

  clearAll() {
    for (const enemy of this.enemies) {
      enemy.sprite.destroy();
      if (enemy.healthBar) {
        enemy.healthBar.destroy();
      }
    }
    this.enemies = [];
  }

  getEnemiesInRange(x: number, y: number, range: number): Enemy[] {
    return this.enemies.filter(enemy => {
      if (enemy.isDead) return false;
      const distance = Phaser.Math.Distance.Between(
        x,
        y,
        enemy.sprite.x,
        enemy.sprite.y
      );
      return distance <= range;
    });
  }
}