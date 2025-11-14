import { create } from "zustand";

type SoundMode = 'ALL_ON' | 'SE_OFF' | 'BG_OFF' | 'MUTE';

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  hitBuffer: AudioBuffer | null;
  audioContext: AudioContext | null;
  isMuted: boolean;
  soundMode: SoundMode;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setHitBuffer: (buffer: AudioBuffer) => void;
  setAudioContext: (context: AudioContext) => void;
  
  // Control functions
  toggleMute: () => void;
  cycleSoundMode: () => void;
  playHit: () => void;
  playSuccess: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  hitBuffer: null,
  audioContext: null,
  isMuted: true, // Start muted by default
  soundMode: 'MUTE',
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setHitBuffer: (buffer) => set({ hitBuffer: buffer }),
  setAudioContext: (context) => set({ audioContext: context }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    // Just update the muted state
    set({ isMuted: newMutedState });
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  cycleSoundMode: () => {
    const { soundMode } = get();
    let newMode: SoundMode;
    let newMutedState: boolean;
    
    switch (soundMode) {
      case 'MUTE':
        newMode = 'ALL_ON';
        newMutedState = false;
        break;
      case 'ALL_ON':
        newMode = 'SE_OFF';
        newMutedState = false;
        break;
      case 'SE_OFF':
        newMode = 'BG_OFF';
        newMutedState = false;
        break;
      case 'BG_OFF':
        newMode = 'MUTE';
        newMutedState = true;
        break;
      default:
        newMode = 'ALL_ON';
        newMutedState = false;
    }
    
    set({ soundMode: newMode, isMuted: newMutedState });
    console.log(`Sound mode: ${newMode}`);
  },
  
  playHit: () => {
    const { hitBuffer, audioContext, soundMode } = get();
    if (!hitBuffer || !audioContext || soundMode === 'MUTE' || soundMode === 'SE_OFF') {
      return;
    }
    
    try {
      // Resume audio context if suspended (required for some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Create a new buffer source for each play (allows overlapping)
      const source = audioContext.createBufferSource();
      source.buffer = hitBuffer;
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3;
      
      // Connect and play
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);
      
      // Clean up after the sound finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.log("Hit sound play error:", error);
    }
  },
  
  playSuccess: () => {
    const { successSound, soundMode } = get();
    if (successSound) {
      // If sound effects are muted, don't play anything
      if (soundMode === 'MUTE' || soundMode === 'SE_OFF') {
        console.log("Success sound skipped (SE off or muted)");
        return;
      }
      
      successSound.currentTime = 0;
      successSound.play().catch(error => {
        console.log("Success sound play prevented:", error);
      });
    }
  }
}));
