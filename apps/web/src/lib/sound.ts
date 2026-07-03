/**
 * Tiny WebAudio synth — no assets, no dependencies, off by default. Three
 * sounds: exact (rising two-tone), equivalent (single soft tone), miss (low
 * thud). The toggle persists per device.
 */

const KEY = 'playthelegend.sound';

export const soundEnabled = (): boolean =>
  typeof window !== 'undefined' && window.localStorage.getItem(KEY) === 'on';

export const setSoundEnabled = (on: boolean): void => {
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* best-effort */
  }
};

let ctx: AudioContext | null = null;

const tone = (freq: number, start: number, duration: number, gainPeak: number): void => {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const t = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(gainPeak, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
};

export type SoundKind = 'exact' | 'equivalent' | 'miss' | 'solved';

export const playSound = (kind: SoundKind): void => {
  if (!soundEnabled() || typeof window === 'undefined') return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    switch (kind) {
      case 'exact':
        tone(660, 0, 0.12, 0.12);
        tone(880, 0.09, 0.16, 0.12);
        break;
      case 'equivalent':
        tone(520, 0, 0.18, 0.1);
        break;
      case 'miss':
        tone(150, 0, 0.22, 0.16);
        break;
      case 'solved':
        tone(523, 0, 0.12, 0.12);
        tone(659, 0.1, 0.12, 0.12);
        tone(784, 0.2, 0.12, 0.12);
        tone(1047, 0.3, 0.3, 0.14);
        break;
    }
  } catch {
    /* audio blocked — silence is fine */
  }
};
