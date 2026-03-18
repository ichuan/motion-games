// Procedural sound effects using Web Audio API
// No external audio files needed — all sounds generated in real-time

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  fadeOut = true,
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.15) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export const SFX = {
  pop() {
    // Cheerful "pop" — short high-pitched chirp
    playTone(800, 0.08, 'sine', 0.25);
    playTone(1200, 0.06, 'sine', 0.15);
  },

  bomb() {
    // Low rumble + noise
    playTone(80, 0.3, 'sawtooth', 0.3);
    playTone(60, 0.4, 'sine', 0.25);
    playNoise(0.2, 0.2);
  },

  combo() {
    // Rising arpeggio
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 * (i + 1) + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.08 * i);
      osc.stop(now + 0.08 * (i + 1) + 0.1);
    });
  },

  countdown() {
    // Short tick
    playTone(440, 0.08, 'square', 0.15);
  },

  start() {
    // Quick happy jingle
    const ctx = getCtx();
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.25;
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12 * (i + 1) + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.12 * i);
      osc.stop(now + 0.12 * (i + 1) + 0.15);
    });
  },

  result() {
    // Fanfare
    const ctx = getCtx();
    const now = ctx.currentTime;
    [392, 494, 587, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 * (i + 1) + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.15 * i);
      osc.stop(now + 0.15 * (i + 1) + 0.3);
    });
  },
};
