
// 简单的 Web Audio API 合成器，用于生成星战风格音效
// 这样无需加载外部资源，保证离线可用且无版权问题

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // 主音量
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

// 播放光剑挥舞声
export const playSaberSwing = () => {
  if (!audioCtx || !masterGain) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  // 频率滑行模拟多普勒效应
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
};

// 播放光剑撞击/格挡声
export const playSaberClash = () => {
  if (!audioCtx || !masterGain) return;

  // 噪音爆发
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1000;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  
  noise.start();

  // 高频刺耳声
  const osc = audioCtx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
  
  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  
  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

// 播放原力推击声 (低频冲击)
export const playForcePush = () => {
  if (!audioCtx || !masterGain) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
  
  gain.gain.setValueAtTime(1.0, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
  
  // 低通滤波增加厚重感
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 1.0);
};

// 播放受伤/击中声
export const playHit = () => {
  if (!audioCtx || !masterGain) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(masterGain);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.2);
};

// 简单的环境背景音 (Drone)
let bgmOsc: OscillatorNode | null = null;
let bgmGain: GainNode | null = null;

export const startAmbience = () => {
  if (!audioCtx || !masterGain || bgmOsc) return;

  bgmOsc = audioCtx.createOscillator();
  bgmOsc.type = 'sine';
  bgmOsc.frequency.value = 50; // 低频嗡嗡声

  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = 0.1;

  bgmOsc.connect(bgmGain);
  bgmGain.connect(masterGain);
  bgmOsc.start();
};

export const stopAmbience = () => {
  if (bgmOsc) {
    bgmOsc.stop();
    bgmOsc = null;
  }
};
