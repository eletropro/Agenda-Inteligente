// Pleasant, professional harmonic secretary chime synthesized with Web Audio API

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Plays a distinct, crystal-clear 2-note secretary chime
   * Note 1: E5 (659.25 Hz)
   * Note 2: A5 (880.00 Hz) with overtone resonance and soft decay
   */
  public playReminderChime(volume: number = 0.8) {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(volume, 1.0)), now);
      masterGain.connect(ctx.destination);

      // Play Note 1: E5 (starts at 0s, lasts 0.6s)
      this.playChimeNote(ctx, masterGain, 659.25, now, 0.65);

      // Play Note 2: A5 (starts at 0.18s, lasts 0.9s)
      this.playChimeNote(ctx, masterGain, 880.00, now + 0.18, 0.95);

      // Play Note 3: High shimmer harmonic E6 (1318.5 Hz)
      this.playChimeNote(ctx, masterGain, 1318.5, now + 0.35, 1.1, 0.35);
    } catch (err) {
      console.warn('Could not play web audio reminder chime:', err);
    }
  }

  private playChimeNote(
    ctx: AudioContext,
    destination: AudioNode,
    freq: number,
    startTime: number,
    duration: number,
    gainMultiplier: number = 1.0
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Exponential decay bell curve
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.4 * gainMultiplier, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  /**
   * Subtle click/start sound for voice recording
   */
  public playRecordingBeep() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      // Ignore background restrictions
    }
  }
}

export const soundService = new SoundService();
