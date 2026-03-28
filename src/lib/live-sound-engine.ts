/**
 * Web Audio–based sound engine for Live alerts.
 * Single shared AudioContext, three preset tones.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c.state === "suspended") await c.resume();
  // Play a near-silent blip to fully unlock on iOS/Safari
  const osc = c.createOscillator();
  const gain = c.createGain();
  gain.gain.value = 0.001;
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.05);
}

function pip(freq: number, duration: number, startOffset: number, vol = 0.18) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.setTargetAtTime(0, c.currentTime + startOffset + duration * 0.7, 0.02);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + startOffset);
  osc.stop(c.currentTime + startOffset + duration);
}

export type SoundPreset = "canceled" | "delay" | "nextSoon";

export function playPreset(kind: SoundPreset) {
  const c = getCtx();
  if (c.state !== "running") return; // not unlocked yet

  switch (kind) {
    case "nextSoon":
      // Two bright short pips
      pip(1200, 0.08, 0);
      pip(1200, 0.08, 0.14);
      break;
    case "delay":
      // One lower, slightly longer pip
      pip(600, 0.18, 0, 0.22);
      break;
    case "canceled":
      // Two descending tones
      pip(800, 0.12, 0, 0.2);
      pip(500, 0.18, 0.18, 0.2);
      break;
  }
}
