import { useEffect, useRef } from 'react';
import { useAudio } from '@/lib/stores/useAudio';
import { useGame } from '@/lib/stores/useGame';

export function SoundManager() {
  const setBackgroundMusic = useAudio(state => state.setBackgroundMusic);
  const setHitSound = useAudio(state => state.setHitSound);
  const setSuccessSound = useAudio(state => state.setSuccessSound);
  const setHitBuffer = useAudio(state => state.setHitBuffer);
  const setAudioContext = useAudio(state => state.setAudioContext);
  const playHit = useAudio(state => state.playHit);
  const playSuccess = useAudio(state => state.playSuccess);
  const soundMode = useAudio(state => state.soundMode);
  const backgroundMusic = useAudio(state => state.backgroundMusic);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const hitBufferRef = useRef<AudioBuffer | null>(null);
  
  useEffect(() => {
    const bgMusic = new Audio('/sounds/background-music-original.mp3');
    bgMusic.preload = 'auto';
    setBackgroundMusic(bgMusic);
    
    const successAudio = new Audio('/sounds/success.mp3');
    successAudio.volume = 0.5;
    setSuccessSound(successAudio);
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    setAudioContext(audioContext);
    
    // Load background music with Web Audio API for seamless looping
    fetch('/sounds/background-music-original.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        audioBufferRef.current = audioBuffer;
        console.log('Background music loaded for seamless looping');
      })
      .catch(err => console.log('Error loading background music:', err));
    
    // Load hit sound with Web Audio API for low-latency playback
    fetch('/sounds/hit.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        hitBufferRef.current = audioBuffer;
        setHitBuffer(audioBuffer);
        console.log('Hit sound loaded for low-latency playback');
      })
      .catch(err => console.log('Error loading hit sound:', err));
    
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      if (bassFilterRef.current) {
        bassFilterRef.current.disconnect();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [setBackgroundMusic, setSuccessSound, setHitBuffer, setAudioContext]);
  
  useEffect(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    const shouldPlayBG = soundMode === 'ALL_ON' || soundMode === 'SE_OFF';
    
    if (shouldPlayBG) {
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      if (!sourceNodeRef.current) {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.loop = true;
        
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 0.25;
        gainNodeRef.current = gainNode;
        
        // Create bass reduction filter to prevent distortion
        const bassFilter = audioContextRef.current.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 250; // Affects frequencies below 250Hz
        bassFilter.gain.value = -12; // Reduce bass by 12dB
        bassFilterRef.current = bassFilter;
        
        // Connect: source -> bass filter -> gain -> destination
        source.connect(bassFilter);
        bassFilter.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        source.start(0);
        sourceNodeRef.current = source;
        console.log('Background music started playing (seamless loop with bass reduction)');
      }
    } else {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (bassFilterRef.current) {
        bassFilterRef.current.disconnect();
        bassFilterRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
    }
  }, [soundMode]);
  
  useEffect(() => {
    const unsubscribe = useGame.subscribe(
      (state) => state.blocks.length,
      (blocksLength, prevBlocksLength) => {
        if (blocksLength > prevBlocksLength) {
          playSuccess();
        }
      }
    );
    
    return unsubscribe;
  }, [playSuccess]);
  
  return null;
}
