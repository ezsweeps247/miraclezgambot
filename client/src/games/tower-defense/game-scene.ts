import Phaser from 'phaser';
import { EnemyManager } from './enemies';
import { BulletManager } from './bullets';
import { TowerManager } from './turrets';
import { WaveManager } from './waves';
import { GameState, TOWER_TYPES } from './types';
import { modernSounds } from '@/lib/modern-sounds';

export class TowerDefenseGameScene extends Phaser.Scene {
  private enemyManager!: EnemyManager;
  private bulletManager!: BulletManager;
  private towerManager!: TowerManager;
  private waveManager!: WaveManager;
  private gameState!: GameState;
  private onGameEnd?: (won: boolean, score: number) => void;
  private audioEnabled: boolean = true;
  private audioContext?: AudioContext;
  private isBetPlaced: boolean = false;
  
  // UI Elements
  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  // Tower buttons removed - now handled externally
  private selectedTowerPreview?: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  
  constructor() {
    super({ key: 'TowerDefenseGameScene' });
  }
  
  create() {
    // Use modern sound system instead of basic oscillators
    modernSounds.setEnabled(this.audioEnabled);
    
    // Initialize game state
    this.gameState = {
      gold: 150, // Starting gold
      lives: 20,
      wave: 0,
      isPlaying: false,
      gameOver: false,
      selectedTowerType: null,
      score: 0
    };
    
    // Bet must be placed before starting
    this.isBetPlaced = false;
    
    // Get game dimensions
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Create background - matches casino dark theme
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x0a0d14);
    
    // Create grid
    this.createGrid();
    
    // Create path
    this.createPath();
    
    // Initialize managers
    this.enemyManager = new EnemyManager(
      this,
      (enemy) => this.onEnemyReachEnd(enemy),
      (enemy) => this.onEnemyKilled(enemy)
    );
    
    this.bulletManager = new BulletManager(this);
    this.towerManager = new TowerManager(this, this.bulletManager);
    this.waveManager = new WaveManager();
    
    // Connect managers
    this.bulletManager.setEnemyManager(this.enemyManager);
    this.towerManager.setEnemyManager(this.enemyManager);
    
    // Create UI
    this.createUI();
    
    // Create audio toggle button
    this.createAudioToggle();
    
    // Handle input
    this.setupInput();
  }
  
  private createAudioToggle() {
    // Position the sound toggle in the bottom-left corner to avoid overlapping game elements
    const buttonX = 30;
    const buttonY = this.scale.height - 30;
    
    const buttonBg = this.add.rectangle(buttonX, buttonY, 50, 50, 0x1a1d1e, 0.9);
    buttonBg.setInteractive();
    buttonBg.setStrokeStyle(2, 0xfbbf24);
    
    const buttonText = this.add.text(buttonX, buttonY, '🔊', {
      fontSize: '20px',
      color: '#ffffff'
    });
    buttonText.setOrigin(0.5);
    
    buttonBg.on('pointerdown', () => {
      this.audioEnabled = !this.audioEnabled;
      modernSounds.setEnabled(this.audioEnabled);
      buttonText.setText(this.audioEnabled ? '🔊' : '🔇');
      this.playSound('click');
    });
    
    // High depth to ensure it's always on top
    buttonBg.setDepth(1000);
    buttonText.setDepth(1001);
  }
  
  playSound(type: 'place' | 'shoot' | 'hit' | 'destroy' | 'wave' | 'gameover' | 'click', variation?: number) {
    if (!this.audioEnabled) return;
    
    // Use modern sound system for high-quality audio
    switch(type) {
      case 'place':
        // Tower placement sound - modern thunk with coin sound
        modernSounds.playClick();
        setTimeout(() => modernSounds.playCredit(), 50);
        break;
      case 'shoot':
        // Different sounds for different tower types based on variation
        const towerType = variation === 0 ? 'basic' : 
                          variation === 1 ? 'sniper' :
                          variation === 2 ? 'cannon' : 'laser';
        modernSounds.playTowerShoot(towerType);
        break;
      case 'hit':
        // Modern impact sound
        modernSounds.playEnemyHit();
        break;
      case 'destroy':
        // Enemy defeated with reward sound
        modernSounds.playEnemyDestroy();
        break;
      case 'wave':
        // Wave complete victory fanfare
        modernSounds.playWin();
        break;
      case 'gameover':
        // Modern defeat sound
        modernSounds.playError();
        break;
      case 'click':
        // Modern UI click
        modernSounds.playClick();
        break;
    }
  }
  
  private createGrid() {
    this.gridGraphics = this.add.graphics();
    
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const cellSize = gameWidth / 16; // Scale grid to game width
    
    // Draw a more visible grid with alternating opacity for better visibility
    // Main grid lines - brighter and more visible
    this.gridGraphics.lineStyle(1, 0x4a5568, 0.6); // Brighter gray with higher opacity
    
    // Draw vertical lines
    for (let i = 0; i <= 16; i++) {
      // Every 4th line is slightly brighter for visual grouping
      if (i % 4 === 0) {
        this.gridGraphics.lineStyle(1, 0x6b7280, 0.7);
      } else {
        this.gridGraphics.lineStyle(1, 0x4a5568, 0.5);
      }
      this.gridGraphics.moveTo(cellSize * i, 0);
      this.gridGraphics.lineTo(cellSize * i, gameHeight);
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= Math.ceil(gameHeight / cellSize); i++) {
      // Every 4th line is slightly brighter for visual grouping
      if (i % 4 === 0) {
        this.gridGraphics.lineStyle(1, 0x6b7280, 0.7);
      } else {
        this.gridGraphics.lineStyle(1, 0x4a5568, 0.5);
      }
      this.gridGraphics.moveTo(0, cellSize * i);
      this.gridGraphics.lineTo(gameWidth, cellSize * i);
    }
    
    // Add subtle grid cell highlights where towers can be placed (not on path)
    this.gridGraphics.fillStyle(0x2d3748, 0.15); // Very subtle fill for placeable areas
    
    this.gridGraphics.setDepth(-1);
  }
  
  private createPath() {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    
    // Scale path points relative to game dimensions
    const scaleX = gameWidth / 800;
    const scaleY = gameHeight / 600;
    
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.lineStyle(30 * Math.min(scaleX, scaleY), 0x1a1d1e, 0.6);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(50 * scaleX, 300 * scaleY);
    this.pathGraphics.lineTo(200 * scaleX, 300 * scaleY);
    this.pathGraphics.lineTo(200 * scaleX, 150 * scaleY);
    this.pathGraphics.lineTo(400 * scaleX, 150 * scaleY);
    this.pathGraphics.lineTo(400 * scaleX, 450 * scaleY);
    this.pathGraphics.lineTo(600 * scaleX, 450 * scaleY);
    this.pathGraphics.lineTo(600 * scaleX, 300 * scaleY);
    this.pathGraphics.lineTo(750 * scaleX, 300 * scaleY);
    this.pathGraphics.strokePath();
    this.pathGraphics.setDepth(0);
    
    // Add start/end markers
    const markerSize = 25 * Math.min(scaleX, scaleY);
    const startCircle = this.add.circle(50 * scaleX, 300 * scaleY, markerSize, 0x10b981, 0.8);
    const endCircle = this.add.circle(750 * scaleX, 300 * scaleY, markerSize, 0xef4444, 0.8);
    startCircle.setDepth(0);
    endCircle.setDepth(0);
    
    // Add labels
    const fontSize = Math.max(10, Math.floor(12 * Math.min(scaleX, scaleY)));
    this.add.text(50 * scaleX, 300 * scaleY, 'START', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontFamily: 'Inter'
    }).setOrigin(0.5).setDepth(1);
    
    this.add.text(750 * scaleX, 300 * scaleY, 'END', {
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      fontFamily: 'Inter'
    }).setOrigin(0.5).setDepth(1);
  }
  
  private createUI() {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const scaleX = gameWidth / 800;
    const scaleY = gameHeight / 600;
    const scale = Math.min(scaleX, scaleY);
    
    // Top bar background - matches casino card style
    const topBarHeight = 60 * scale;
    const topBar = this.add.rectangle(gameWidth / 2, topBarHeight / 2, gameWidth, topBarHeight, 0x1a1d1e, 0.9);
    topBar.setDepth(10);
    
    // UI font size
    const uiFontSize = Math.max(14, Math.floor(20 * scale));
    const iconSize = Math.max(8, Math.floor(10 * scale));
    
    // Gold display - casino gold color
    const goldIcon = this.add.circle(50 * scaleX, topBarHeight / 2, iconSize, 0xd4af37, 1);
    goldIcon.setDepth(11);
    this.goldText = this.add.text(75 * scaleX, topBarHeight / 2, `${this.gameState.gold}`, {
      fontSize: `${uiFontSize}px`,
      color: '#d4af37',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);
    
    // Lives display
    const heartIcon = this.add.circle(200 * scaleX, topBarHeight / 2, iconSize, 0xef4444, 1);
    heartIcon.setDepth(11);
    this.livesText = this.add.text(225 * scaleX, topBarHeight / 2, `${this.gameState.lives}`, {
      fontSize: `${uiFontSize}px`,
      color: '#ef4444',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(11);
    
    // Wave display
    this.waveText = this.add.text(gameWidth / 2, topBarHeight / 2, `Wave: ${this.gameState.wave}`, {
      fontSize: `${uiFontSize}px`,
      color: '#ffffff',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(11);
    
    // Score display
    this.scoreText = this.add.text(gameWidth * 0.75, topBarHeight / 2, `Score: ${this.gameState.score}`, {
      fontSize: `${uiFontSize}px`,
      color: '#10b981',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(11);
    
    // Tower selection now handled externally by React component
    
    // Start wave button - casino gold theme (positioned in top-right to avoid tower button overlap)
    const buttonWidth = Math.max(80, 120 * scale);
    const buttonHeight = Math.max(30, 40 * scale);
    // Position button in top-right corner, below the top bar (reuse topBarHeight from above)
    const startButton = this.add.container(gameWidth - buttonWidth/2 - 20 * scaleX, (60 * scale) + buttonHeight/2 + 10 * scaleY);
    const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0xd4af37, 0.9);
    const buttonFontSize = Math.max(12, Math.floor(16 * scale));
    const buttonText = this.add.text(0, 0, 'Start Wave', {
      fontSize: `${buttonFontSize}px`,
      color: '#000000',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    startButton.add([buttonBg, buttonText]);
    startButton.setDepth(11);
    startButton.setInteractive(new Phaser.Geom.Rectangle(-60, -20, 120, 40), Phaser.Geom.Rectangle.Contains);
    
    startButton.on('pointerdown', () => {
      if (!this.isBetPlaced) {
        // Show warning message if bet not placed
        const warningText = this.add.text(
          gameWidth / 2,
          gameHeight / 2,
          'Please place a bet first!',
          {
            fontSize: `${Math.max(20, Math.floor(30 * scale))}px`,
            color: '#ef4444',
            fontFamily: 'Inter',
            fontStyle: 'bold',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
          }
        ).setOrigin(0.5).setDepth(100);
        
        // Fade out warning after 2 seconds
        this.tweens.add({
          targets: warningText,
          alpha: 0,
          duration: 2000,
          onComplete: () => warningText.destroy()
        });
        
        this.playSound('click');
        return;
      }
      
      if (!this.gameState.isPlaying && !this.gameState.gameOver) {
        this.startNextWave();
      }
    });
    
    startButton.on('pointerover', () => {
      buttonBg.setFillStyle(0xd4af37, 1);
    });
    
    startButton.on('pointerout', () => {
      buttonBg.setFillStyle(0xd4af37, 0.9);
    });
  }
  
  // External method to set tower selection from React component
  public setSelectedTowerType(towerType: keyof typeof TOWER_TYPES | null) {
    this.gameState.selectedTowerType = towerType;
  }
  
  // Tower selection state no longer managed in-game
  
  private setupInput() {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.gameState.selectedTowerType) {
        // Show tower placement preview
        if (!this.selectedTowerPreview) {
          this.selectedTowerPreview = this.add.graphics();
          this.selectedTowerPreview.setDepth(5);
        }
        
        // Use regular pointer coordinates for better alignment
        const pointerX = pointer.x;
        const pointerY = pointer.y;
        
        const canPlace = this.towerManager.canPlaceTower(pointerX, pointerY);
        const preview = this.towerManager.showPlacementPreview(pointerX, pointerY, canPlace);
        
        this.selectedTowerPreview.clear();
        this.selectedTowerPreview.lineStyle(2, canPlace ? 0xd4af37 : 0xef4444, 0.8);
        // Draw circular tower preview instead of rectangle
        this.selectedTowerPreview.strokeCircle(preview.x, preview.y, 25);
        
        const towerType = TOWER_TYPES[this.gameState.selectedTowerType];
        if (towerType) {
          this.selectedTowerPreview.lineStyle(1, 0xd4af37, 0.2);
          this.selectedTowerPreview.strokeCircle(preview.x, preview.y, towerType.range);
        }
      } else if (this.selectedTowerPreview) {
        this.selectedTowerPreview.clear();
      }
    });
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // More generous placement area for mobile - use dynamic height calculation
      const placementAreaHeight = this.scale.height - 100; // Leave room for tower buttons
      
      // Use regular pointer coordinates for better alignment
      const pointerX = pointer.x;
      const pointerY = pointer.y;
      
      if (this.gameState.selectedTowerType && pointerY < placementAreaHeight) {
        const towerType = TOWER_TYPES[this.gameState.selectedTowerType];
        
        if (this.gameState.gold >= towerType.cost) {
          const tower = this.towerManager.placeTower(
            pointerX,
            pointerY,
            this.gameState.selectedTowerType
          );
          
          if (tower) {
            this.gameState.gold -= towerType.cost;
            this.updateUI();
            
            // Clear selection after placement
            this.gameState.selectedTowerType = null;
            if (this.selectedTowerPreview) {
              this.selectedTowerPreview.clear();
            }
          }
        }
      }
    });
    
    // ESC to cancel tower selection
    this.input.keyboard?.on('keydown-ESC', () => {
      this.gameState.selectedTowerType = null;
      if (this.selectedTowerPreview) {
        this.selectedTowerPreview.clear();
      }
    });
  }
  
  private startNextWave() {
    this.gameState.wave++;
    this.gameState.isPlaying = true;
    this.waveManager.startWave(this.gameState.wave);
    this.waveManager.resetTiming(); // Reset timing for consistent spawning
    this.updateUI();
  }
  
  private onEnemyReachEnd(enemy: any) {
    this.gameState.lives--;
    this.updateUI();
    
    // Flash screen red
    const flash = this.add.rectangle(400, 300, 800, 600, 0xef4444, 0.3);
    flash.setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy()
    });
    
    if (this.gameState.lives <= 0) {
      this.gameOver(false);
    }
  }
  
  private onEnemyKilled(enemy: any) {
    this.gameState.gold += enemy.reward;
    this.gameState.score += enemy.reward * this.gameState.wave;
    this.updateUI();
    
    // Create gold popup - casino gold
    const goldText = this.add.text(enemy.sprite.x, enemy.sprite.y, `+$${enemy.reward}`, {
      fontSize: '14px',
      color: '#d4af37',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    goldText.setDepth(10);
    
    this.tweens.add({
      targets: goldText,
      y: goldText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => goldText.destroy()
    });
  }
  
  private updateUI() {
    this.goldText.setText(`${this.gameState.gold}`);
    this.livesText.setText(`${this.gameState.lives}`);
    this.waveText.setText(`Wave: ${this.gameState.wave}`);
    this.scoreText.setText(`Score: ${this.gameState.score}`);
    
    // Tower button state updates now handled externally
  }
  
  update(time: number, delta: number) {
    if (this.gameState.gameOver) return;
    
    // Update managers
    this.enemyManager.update(delta);
    this.bulletManager.update(delta);
    this.towerManager.update(time, delta);
    
    // Update wave spawning - use Date.now() for consistent timing
    if (this.gameState.isPlaying) {
      this.waveManager.update(Date.now(), (type) => {
        this.enemyManager.spawnEnemy(type);
      });
      
      // Check wave completion
      if (this.waveManager.isWaveComplete() && this.enemyManager.getEnemies().length === 0) {
        this.gameState.isPlaying = false;
        
        // Wave complete bonus
        const bonus = 50 * this.gameState.wave;
        this.gameState.gold += bonus;
        this.gameState.score += bonus;
        this.updateUI();
        
        // Show wave complete message - casino gold
        const completeText = this.add.text(400, 300, `Wave ${this.gameState.wave} Complete!\n+$${bonus} Bonus`, {
          fontSize: '32px',
          color: '#d4af37',
          fontFamily: 'Inter',
          fontStyle: 'bold',
          align: 'center'
        }).setOrigin(0.5);
        completeText.setDepth(20);
        completeText.setStroke('#000000', 4);
        
        this.tweens.add({
          targets: completeText,
          scale: 1.2,
          alpha: 0,
          duration: 2000,
          ease: 'Power2',
          onComplete: () => completeText.destroy()
        });
        
        // Check for victory (survived 10 waves)
        if (this.gameState.wave >= 10) {
          this.gameOver(true);
        }
      }
    }
  }
  
  private gameOver(won: boolean) {
    this.gameState.gameOver = true;
    this.gameState.isPlaying = false;
    
    // Clear all entities
    this.enemyManager.clearAll();
    this.bulletManager.clearAll();
    
    // Show game over screen
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
    overlay.setDepth(30);
    
    const resultText = this.add.text(400, 250, won ? 'VICTORY!' : 'DEFEAT!', {
      fontSize: '48px',
      color: won ? '#d4af37' : '#ef4444',
      fontFamily: 'Inter',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    resultText.setDepth(31);
    resultText.setStroke('#000000', 6);
    
    const scoreText = this.add.text(400, 320, `Final Score: ${this.gameState.score}`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Inter'
    }).setOrigin(0.5);
    scoreText.setDepth(31);
    
    const waveText = this.add.text(400, 360, `Waves Survived: ${this.gameState.wave}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Inter'
    }).setOrigin(0.5);
    waveText.setDepth(31);
    
    // Trigger callback
    if (this.onGameEnd) {
      this.onGameEnd(won, this.gameState.score);
    }
  }
  
  startGame(onGameEnd: (won: boolean, score: number) => void) {
    this.onGameEnd = onGameEnd;
    
    // Reset game state
    this.gameState = {
      gold: 150,
      lives: 20,
      wave: 0,
      isPlaying: false,
      gameOver: false,
      selectedTowerType: null,
      score: 0
    };
    
    // Clear everything
    this.enemyManager.clearAll();
    this.bulletManager.clearAll();
    this.towerManager.clearAll();
    this.waveManager.reset();
    
    // Update UI
    this.updateUI();
    
    // Show start message
    const startText = this.add.text(400, 300, 'Game Starting!', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Inter'
    }).setOrigin(0.5);
    startText.setDepth(20);
    startText.setStroke('#000000', 4);
    
    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 2000,
      onComplete: () => startText.destroy()
    });
    
    // Don't automatically start the first wave - let player click Start Wave button
  }
  
  // Enable the game to be started (called when bet is placed)
  enableGameStart() {
    this.isBetPlaced = true;
  }
  
  // Reset bet state (called when game ends)
  resetBetState() {
    this.isBetPlaced = false;
  }
  
  // Set game end callback
  setGameEndCallback(callback: (won: boolean, score: number) => void) {
    this.onGameEnd = callback;
  }
}