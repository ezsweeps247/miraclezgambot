import Phaser from 'phaser';
import { Tower, Enemy, TOWER_TYPES } from './types';
import { BulletManager } from './bullets';
import { EnemyManager } from './enemies';

export class TowerManager {
  private scene: Phaser.Scene;
  private towers: Tower[] = [];
  private bulletManager: BulletManager;
  private enemyManager: EnemyManager | null = null;
  private placementGrid: boolean[][] = [];
  private gridSize: number;
  private mapWidth = 16;
  private mapHeight: number;

  constructor(scene: Phaser.Scene, bulletManager: BulletManager) {
    this.scene = scene;
    this.bulletManager = bulletManager;
    // Calculate grid size based on actual game dimensions
    this.gridSize = this.scene.scale.width / 16;
    this.mapHeight = Math.ceil(this.scene.scale.height / this.gridSize);
    this.initializePlacementGrid();
  }

  setEnemyManager(enemyManager: EnemyManager) {
    this.enemyManager = enemyManager;
  }

  private initializePlacementGrid() {
    // Initialize grid - all cells are placeable initially
    for (let y = 0; y < this.mapHeight; y++) {
      this.placementGrid[y] = [];
      for (let x = 0; x < this.mapWidth; x++) {
        this.placementGrid[y][x] = true;
      }
    }
    
    // Block path cells (approximate path blocking)
    this.blockPathCells();
  }

  private blockPathCells() {
    // Block cells along the enemy path - scale based on actual dimensions
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const scaleX = gameWidth / 800;
    const scaleY = gameHeight / 600;
    
    // Convert path coordinates to grid coordinates
    const pathPoints = [
      {x: 50 * scaleX, y: 300 * scaleY},
      {x: 200 * scaleX, y: 300 * scaleY},
      {x: 200 * scaleX, y: 150 * scaleY},
      {x: 400 * scaleX, y: 150 * scaleY},
      {x: 400 * scaleX, y: 450 * scaleY},
      {x: 600 * scaleX, y: 450 * scaleY},
      {x: 600 * scaleX, y: 300 * scaleY},
      {x: 750 * scaleX, y: 300 * scaleY}
    ];
    
    // Block cells along the path with proper scaling
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const start = pathPoints[i];
      const end = pathPoints[i + 1];
      
      const startGridX = Math.floor(start.x / this.gridSize);
      const startGridY = Math.floor(start.y / this.gridSize);
      const endGridX = Math.floor(end.x / this.gridSize);
      const endGridY = Math.floor(end.y / this.gridSize);
      
      // Block cells along the line segment
      if (startGridX === endGridX) {
        // Vertical segment
        const minY = Math.min(startGridY, endGridY);
        const maxY = Math.max(startGridY, endGridY);
        for (let y = minY; y <= maxY; y++) {
          if (y >= 0 && y < this.mapHeight && startGridX >= 0 && startGridX < this.mapWidth) {
            this.placementGrid[y][startGridX] = false;
            // Block adjacent cells for wider path
            if (startGridX > 0) this.placementGrid[y][startGridX - 1] = false;
            if (startGridX < this.mapWidth - 1) this.placementGrid[y][startGridX + 1] = false;
          }
        }
      } else if (startGridY === endGridY) {
        // Horizontal segment
        const minX = Math.min(startGridX, endGridX);
        const maxX = Math.max(startGridX, endGridX);
        for (let x = minX; x <= maxX; x++) {
          if (x >= 0 && x < this.mapWidth && startGridY >= 0 && startGridY < this.mapHeight) {
            this.placementGrid[startGridY][x] = false;
            // Block adjacent cells for wider path
            if (startGridY > 0) this.placementGrid[startGridY - 1][x] = false;
            if (startGridY < this.mapHeight - 1) this.placementGrid[startGridY + 1][x] = false;
          }
        }
      }
    }
  }

  canPlaceTower(x: number, y: number): boolean {
    // Use floor for consistent grid alignment
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    
    if (gridX < 0 || gridX >= this.mapWidth || gridY < 0 || gridY >= this.mapHeight) {
      return false;
    }
    
    // Check if cell is free and not on path
    if (!this.placementGrid[gridY][gridX]) {
      return false;
    }
    
    // Check if there's already a tower nearby (more forgiving for mobile)
    const cellCenterX = gridX * this.gridSize + this.gridSize / 2;
    const cellCenterY = gridY * this.gridSize + this.gridSize / 2;
    
    for (const tower of this.towers) {
      // Increase distance threshold for more forgiving placement
      const distance = Math.sqrt(
        Math.pow(tower.sprite.x - cellCenterX, 2) + 
        Math.pow(tower.sprite.y - cellCenterY, 2)
      );
      if (distance < 40) { // Adjusted spacing for proper placement
        return false;
      }
    }
    
    return true;
  }

  placeTower(x: number, y: number, type: string): Tower | null {
    if (!this.canPlaceTower(x, y)) {
      return null;
    }
    
    const towerType = TOWER_TYPES[type.toUpperCase() as keyof typeof TOWER_TYPES] || TOWER_TYPES.BASIC;
    
    // Snap to grid center with floor for consistent alignment
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    const placementX = gridX * this.gridSize + this.gridSize / 2;
    const placementY = gridY * this.gridSize + this.gridSize / 2;
    
    // Create circular tower sprite - smaller size
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(towerType.color, 1);
    graphics.fillCircle(15, 15, 12); // Smaller circle (was 18, now 12)
    
    // Add barrel (adjusted for smaller tower)
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(15, 13, 15, 4); // Smaller barrel positioned from center
    
    graphics.generateTexture(`tower_${type}`, 30, 30); // Smaller texture (was 50x50)
    graphics.destroy();
    
    const sprite = this.scene.add.sprite(placementX, placementY, `tower_${type}`);
    sprite.setDepth(1);
    
    // Create range indicator
    const rangeCircle = this.scene.add.graphics();
    rangeCircle.lineStyle(1, 0x00ff00, 0.3);
    rangeCircle.strokeCircle(placementX, placementY, towerType.range);
    rangeCircle.setVisible(false);
    rangeCircle.setDepth(0);
    
    const tower: Tower = {
      sprite,
      type: towerType.name,
      damage: towerType.damage,
      fireRate: towerType.fireRate,
      range: towerType.range,
      cost: towerType.cost,
      lastFired: 0,
      level: 1,
      rangeCircle
    };
    
    // Add click handler to show/hide range
    sprite.setInteractive();
    sprite.on('pointerdown', () => {
      // Hide all other range circles
      this.towers.forEach(t => {
        if (t.rangeCircle) {
          t.rangeCircle.setVisible(false);
        }
      });
      // Toggle this tower's range circle
      if (rangeCircle) {
        rangeCircle.setVisible(!rangeCircle.visible);
      }
    });
    
    this.towers.push(tower);
    
    // Mark grid cell as occupied
    this.placementGrid[gridY][gridX] = false;
    
    // Add placement effect
    this.createPlacementEffect(placementX, placementY);
    
    return tower;
  }

  update(time: number, delta: number) {
    if (!this.enemyManager) return;
    
    for (const tower of this.towers) {
      // Check if tower can fire
      if (time - tower.lastFired < tower.fireRate) {
        continue;
      }
      
      // Find enemies in range
      const enemiesInRange = this.enemyManager.getEnemiesInRange(
        tower.sprite.x,
        tower.sprite.y,
        tower.range
      );
      
      if (enemiesInRange.length > 0) {
        // Target closest enemy
        let closestEnemy: Enemy | null = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemiesInRange) {
          const distance = Phaser.Math.Distance.Between(
            tower.sprite.x,
            tower.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y
          );
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
          }
        }
        
        if (closestEnemy) {
          // Rotate tower to face enemy
          const angle = Phaser.Math.Angle.Between(
            tower.sprite.x,
            tower.sprite.y,
            closestEnemy.sprite.x,
            closestEnemy.sprite.y
          );
          tower.sprite.rotation = angle;
          
          // Fire bullet
          const bulletColor = tower.type === 'laser' ? 0xff0000 :
                            tower.type === 'sniper' ? 0x0000ff :
                            tower.type === 'cannon' ? 0xffa500 : 0xffff00;
          
          this.bulletManager.createBullet(
            tower.sprite.x,
            tower.sprite.y,
            closestEnemy,
            tower.damage,
            300,
            bulletColor
          );
          
          tower.lastFired = time;
          
          // Add muzzle flash effect
          this.createMuzzleFlash(tower.sprite.x, tower.sprite.y, angle);
        }
      }
    }
  }

  private createPlacementEffect(x: number, y: number) {
    const effect = this.scene.add.graphics();
    effect.lineStyle(2, 0x00ff00, 1);
    effect.strokeCircle(x, y, 15); // Smaller effect for smaller towers
    effect.setDepth(5);
    
    this.scene.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 1.2,
      duration: 500,
      onComplete: () => effect.destroy()
    });
  }

  private createMuzzleFlash(x: number, y: number, angle: number) {
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffff00, 1);
    flash.fillCircle(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15, 4); // Adjusted for smaller towers
    flash.setDepth(5);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 100,
      onComplete: () => flash.destroy()
    });
  }

  upgradeTower(tower: Tower): boolean {
    if (tower.level >= 3) return false;
    
    tower.level++;
    tower.damage *= 1.5;
    tower.range *= 1.1;
    tower.fireRate *= 0.8;
    
    // Update visual
    tower.sprite.setScale(1 + (tower.level - 1) * 0.1);
    
    // Update range circle
    if (tower.rangeCircle) {
      tower.rangeCircle.clear();
      tower.rangeCircle.lineStyle(1, 0x00ff00, 0.3);
      tower.rangeCircle.strokeCircle(tower.sprite.x, tower.sprite.y, tower.range);
    }
    
    return true;
  }

  sellTower(tower: Tower): number {
    const index = this.towers.indexOf(tower);
    if (index === -1) return 0;
    
    // Get sell value (50% of total investment)
    const sellValue = tower.cost * 0.5 * tower.level;
    
    // Free up grid cell
    const gridX = Math.floor((tower.sprite.x - this.gridSize / 2) / this.gridSize);
    const gridY = Math.floor((tower.sprite.y - this.gridSize / 2) / this.gridSize);
    this.placementGrid[gridY][gridX] = true;
    
    // Remove tower
    tower.sprite.destroy();
    if (tower.rangeCircle) {
      tower.rangeCircle.destroy();
    }
    this.towers.splice(index, 1);
    
    return sellValue;
  }

  getTowerAt(x: number, y: number): Tower | null {
    for (const tower of this.towers) {
      const distance = Phaser.Math.Distance.Between(x, y, tower.sprite.x, tower.sprite.y);
      if (distance < 15) { // Smaller detection radius for smaller towers
        return tower;
      }
    }
    return null;
  }

  clearAll() {
    for (const tower of this.towers) {
      tower.sprite.destroy();
      if (tower.rangeCircle) {
        tower.rangeCircle.destroy();
      }
    }
    this.towers = [];
    this.initializePlacementGrid();
  }

  showPlacementPreview(x: number, y: number, isValid: boolean) {
    // Consistent grid alignment with placement
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    
    // Clamp to grid bounds
    const clampedX = Math.max(0, Math.min(gridX, this.mapWidth - 1));
    const clampedY = Math.max(0, Math.min(gridY, this.mapHeight - 1));
    
    const previewX = clampedX * this.gridSize + this.gridSize / 2;
    const previewY = clampedY * this.gridSize + this.gridSize / 2;
    
    return { x: previewX, y: previewY, valid: isValid };
  }
}