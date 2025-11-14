/**
 * Modern Sound System for Casino Games
 * Provides high-quality, layered sounds using advanced Web Audio API techniques
 */

export class ModernSoundSystem {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private compressor: DynamicsCompressorNode | null = null;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain for volume control
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      
      // Add a compressor for better sound dynamics
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      
      // Connect the chain
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioContext.destination);
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? 0.5 : 0;
    }
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  // Modern coin/credit sound
  playCredit() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Create multiple oscillators for richness
    const fundamental = this.audioContext.createOscillator();
    const harmonic1 = this.audioContext.createOscillator();
    const harmonic2 = this.audioContext.createOscillator();
    
    fundamental.type = 'triangle';
    fundamental.frequency.setValueAtTime(800, now);
    fundamental.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    fundamental.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
    
    harmonic1.type = 'sine';
    harmonic1.frequency.setValueAtTime(1600, now);
    harmonic1.frequency.exponentialRampToValueAtTime(2400, now + 0.05);
    
    harmonic2.type = 'sine';
    harmonic2.frequency.setValueAtTime(2400, now);
    harmonic2.frequency.exponentialRampToValueAtTime(3600, now + 0.05);
    
    // Create gains for each oscillator
    const fundamentalGain = this.audioContext.createGain();
    const harmonic1Gain = this.audioContext.createGain();
    const harmonic2Gain = this.audioContext.createGain();
    
    fundamentalGain.gain.setValueAtTime(0.3, now);
    fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    harmonic1Gain.gain.setValueAtTime(0.15, now);
    harmonic1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    harmonic2Gain.gain.setValueAtTime(0.1, now);
    harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    // Add a filter for warmth
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.Q.value = 1;
    
    // Connect everything
    fundamental.connect(fundamentalGain);
    harmonic1.connect(harmonic1Gain);
    harmonic2.connect(harmonic2Gain);
    
    fundamentalGain.connect(filter);
    harmonic1Gain.connect(filter);
    harmonic2Gain.connect(filter);
    
    filter.connect(this.masterGain);
    
    // Start and stop
    fundamental.start(now);
    harmonic1.start(now);
    harmonic2.start(now);
    
    fundamental.stop(now + 0.2);
    harmonic1.stop(now + 0.2);
    harmonic2.stop(now + 0.2);
  }

  // Modern win sound
  playWin() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Create a chord progression for winning
    const notes = [523, 659, 784, 1047]; // C, E, G, C (C major)
    
    notes.forEach((freq, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);
      
      gain.gain.setValueAtTime(0, now + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, now + index * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.5);
      
      // Add some vibrato for richness
      const vibrato = this.audioContext!.createOscillator();
      const vibratoGain = this.audioContext!.createGain();
      
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 10;
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      vibrato.start(now + index * 0.1);
      osc.start(now + index * 0.1);
      
      vibrato.stop(now + index * 0.1 + 0.6);
      osc.stop(now + index * 0.1 + 0.6);
    });
  }
  
  // Modern lose sound with descending tones
  playLose() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Descending tones for loss
    const frequencies = [440, 330, 220];
    
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;
      
      const startTime = now + i * 0.15;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);
      
      osc.connect(filter).connect(gain).connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }
  
  // Modern jackpot sound with fanfare and celebration
  playJackpot() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Ascending arpeggio for jackpot fanfare
    const notes = [261.63, 329.63, 392, 523.25, 659.25, 784, 1046.5]; // C major scale
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const vibrato = this.audioContext.createOscillator();
      const vibratoGain = this.audioContext.createGain();
      
      // Main tone with vibrato
      osc.type = 'sine';
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 8;
      vibrato.connect(vibratoGain).connect(osc.frequency);
      
      osc.frequency.value = freq;
      
      const startTime = now + i * 0.08;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);
      
      osc.connect(gain).connect(this.masterGain);
      vibrato.start(startTime);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
      vibrato.stop(startTime + 0.6);
    });
    
    // Add bells and sparkle sounds
    for (let i = 0; i < 5; i++) {
      const bell = this.audioContext.createOscillator();
      const bellGain = this.audioContext.createGain();
      const bellFilter = this.audioContext.createBiquadFilter();
      
      bell.type = 'sine';
      bell.frequency.value = 2000 + Math.random() * 2000;
      
      bellFilter.type = 'bandpass';
      bellFilter.frequency.value = bell.frequency.value;
      bellFilter.Q.value = 30;
      
      const bellTime = now + 0.3 + i * 0.05;
      bellGain.gain.setValueAtTime(0.0001, bellTime);
      bellGain.gain.exponentialRampToValueAtTime(0.08, bellTime + 0.01);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.2);
      
      bell.connect(bellFilter).connect(bellGain).connect(this.masterGain);
      bell.start(bellTime);
      bell.stop(bellTime + 0.25);
    }
  }

  // Modern button click
  playClick() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Use white noise with envelope for modern click
    const bufferSize = 0.01 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(now);
    noise.stop(now + 0.02);
  }

  // Modern spin/roll sound
  playSpin() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Create a sweeping filter sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, now + 1);
    filter.Q.value = 5;
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setValueAtTime(0.1, now + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 1.1);
  }

  // Modern error/lose sound
  playError() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Descending tritone for error
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(283, now); // Tritone interval
    osc2.frequency.exponentialRampToValueAtTime(141, now + 0.2);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    // Add some distortion for emphasis
    const waveshaper = this.audioContext.createWaveShaper();
    waveshaper.curve = this.makeDistortionCurve(20);
    waveshaper.oversample = '4x';
    
    osc1.connect(waveshaper);
    osc2.connect(waveshaper);
    waveshaper.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  }

  // Modern dice roll sound
  playDiceRoll() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Multiple quick clicks to simulate dice bouncing
    for (let i = 0; i < 5; i++) {
      const time = now + i * 0.08;
      
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + Math.random() * 200, time);
      
      filter.type = 'highpass';
      filter.frequency.value = 500;
      filter.Q.value = 1;
      
      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(time);
      osc.stop(time + 0.05);
    }
  }

  // Modern card flip sound
  playCardFlip() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Swoosh sound with white noise
    const bufferSize = 0.1 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 10);
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
    filter.Q.value = 2;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Helper function for distortion
  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    
    return curve;
  }

  // Tower Defense specific sounds
  playTowerShoot(towerType: string = 'basic') {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    switch (towerType) {
      case 'basic':
        this.playLaserShot(800, 0.1);
        break;
      case 'sniper':
        this.playLaserShot(1200, 0.15);
        break;
      case 'cannon':
        this.playExplosiveShot();
        break;
      case 'laser':
        this.playBeamSound();
        break;
      default:
        this.playLaserShot(800, 0.1);
    }
  }

  private playLaserShot(frequency: number, duration: number) {
    if (!this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.25, now + duration);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);
    filter.Q.value = 5;
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  private playExplosiveShot() {
    if (!this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Create explosion with filtered noise
    const bufferSize = 0.3 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(now);
    noise.stop(now + 0.4);
  }

  private playBeamSound() {
    if (!this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, now);
    
    // Add some frequency modulation for sci-fi effect
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfo.type = 'sine';
    lfo.frequency.value = 20;
    lfoGain.gain.value = 100;
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 10;
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setValueAtTime(0.1, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    lfo.start(now);
    osc.start(now);
    
    lfo.stop(now + 0.2);
    osc.stop(now + 0.2);
  }

  playEnemyHit() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Quick thud sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playEnemyDestroy() {
    if (!this.enabled || !this.audioContext || !this.masterGain) return;
    
    // Small explosion sound
    this.playExplosiveShot();
    
    // Add a coin sound after a short delay
    setTimeout(() => this.playCredit(), 50);
  }
}

// Create a singleton instance
export const modernSounds = new ModernSoundSystem();