import Phaser from 'phaser';
import { Bullet, Enemy } from './types';

export class BulletManager {
  private scene: Phaser.Scene;
  private bullets: Bullet[] = [];
  private enemyManager: any; // Will be set from game scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setEnemyManager(enemyManager: any) {
    this.enemyManager = enemyManager;
  }

  createBullet(x: number, y: number, target: Enemy, damage: number, speed: number = 300, color: number = 0xffff00) {
    // Create bullet sprite
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(0, 0, 3);
    graphics.generateTexture(`bullet_${color}`, 6, 6);
    graphics.destroy();
    
    const sprite = this.scene.add.sprite(x, y, `bullet_${color}`);
    sprite.setDepth(4);
    
    const bullet: Bullet = {
      sprite,
      damage,
      target,
      speed
    };
    
    this.bullets.push(bullet);
    
    // Add trail effect
    const trail = this.scene.add.graphics();
    trail.lineStyle(2, color, 0.5);
    trail.moveTo(x, y);
    
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 500,
      onComplete: () => trail.destroy()
    });
    
    return bullet;
  }

  update(delta: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      
      // Check if target is still alive
      if (!bullet.target || bullet.target.isDead) {
        this.removeBullet(bullet, i);
        continue;
      }
      
      // Move bullet towards target
      const angle = Phaser.Math.Angle.Between(
        bullet.sprite.x,
        bullet.sprite.y,
        bullet.target.sprite.x,
        bullet.target.sprite.y
      );
      
      const distance = Phaser.Math.Distance.Between(
        bullet.sprite.x,
        bullet.sprite.y,
        bullet.target.sprite.x,
        bullet.target.sprite.y
      );
      
      // Check if bullet reached target
      if (distance < 10) {
        // Hit effect
        this.createHitEffect(bullet.sprite.x, bullet.sprite.y);
        
        // Damage enemy
        if (this.enemyManager) {
          this.enemyManager.damageEnemy(bullet.target, bullet.damage);
        }
        
        this.removeBullet(bullet, i);
      } else {
        // Move bullet
        const velocity = (bullet.speed * delta) / 1000;
        bullet.sprite.x += Math.cos(angle) * velocity;
        bullet.sprite.y += Math.sin(angle) * velocity;
        bullet.sprite.rotation = angle;
      }
    }
  }

  private createHitEffect(x: number, y: number) {
    const effect = this.scene.add.graphics();
    effect.fillStyle(0xffffff, 0.8);
    effect.fillCircle(x, y, 8);
    effect.setDepth(5);
    
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => effect.destroy()
    });
  }

  private removeBullet(bullet: Bullet, index: number) {
    bullet.sprite.destroy();
    this.bullets.splice(index, 1);
  }

  clearAll() {
    for (const bullet of this.bullets) {
      bullet.sprite.destroy();
    }
    this.bullets = [];
  }
}