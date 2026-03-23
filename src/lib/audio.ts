export type InstrumentType = 'piano' | 'guitar' | 'organ';

const SAMPLE_NOTES = {
  'C2': 65.41,
  'G2': 98.00,
  'C3': 130.81,
  'G3': 196.00,
  'C4': 261.63,
  'G4': 392.00,
  'C5': 523.25,
  'G5': 783.99,
  'C6': 1046.50
};

const INSTRUMENT_URLS: Record<InstrumentType, string> = {
  piano: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/',
  guitar: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3/',
  organ: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/drawbar_organ-mp3/'
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  analyser: AnalyserNode | null = null;
  
  buffers: Record<InstrumentType, Record<string, AudioBuffer>> = {
    piano: {},
    guitar: {},
    organ: {}
  };
  
  loading: Record<InstrumentType, boolean> = {
    piano: false,
    guitar: false,
    organ: false
  };

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6; // Slightly louder for samples
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 4096; // Higher resolution for partials
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      const p = this.ctx.resume();
      if (p && p.catch) {
        p.catch(() => {
          // Ignore resume errors if user hasn't interacted yet
        });
      }
    }
  }

  async loadInstrument(instrument: InstrumentType) {
    try {
      this.init();
      
      // If already loaded or currently loading, skip
      if (Object.keys(this.buffers[instrument]).length > 0 || this.loading[instrument]) return;
      
      this.loading[instrument] = true;
      
      const baseUrl = INSTRUMENT_URLS[instrument];
      const promises = Object.keys(SAMPLE_NOTES).map(async (note) => {
        try {
          const response = await fetch(`${baseUrl}${note}.mp3`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
            const promise = this.ctx!.decodeAudioData(
              arrayBuffer,
              (buffer) => resolve(buffer),
              (err) => reject(err)
            );
            if (promise) {
              promise.catch(reject);
            }
          });
          this.buffers[instrument][note] = audioBuffer;
        } catch (e) {
          console.error(`Failed to load ${instrument} sample ${note}:`, e);
        }
      });

      await Promise.all(promises);
      this.loading[instrument] = false;
    } catch (e) {
      console.error("AudioEngine loadInstrument error:", e);
      this.loading[instrument] = false;
    }
  }

  playHarmonic(freq1: number, freq2: number, instrument: InstrumentType = 'piano', durationMs: number = 1500) {
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const dur = durationMs / 1000;
      this.playSample(freq1, t, dur, instrument);
      this.playSample(freq2, t, dur, instrument);
    } catch (e) {
      console.error("AudioEngine playHarmonic error:", e);
    }
  }

  playMelodic(freq1: number, freq2: number, instrument: InstrumentType = 'piano', durationMs: number = 800) {
    try {
      this.init();
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const dur = durationMs / 1000;
      this.playSample(freq1, t, dur, instrument);
      this.playSample(freq2, t + dur, dur, instrument);
    } catch (e) {
      console.error("AudioEngine playMelodic error:", e);
    }
  }

  private playSample(targetFreq: number, startTime: number, dur: number, instrument: InstrumentType) {
    try {
      const instBuffers = this.buffers[instrument];
      const loadedNotes = Object.keys(instBuffers);
      
      if (loadedNotes.length === 0 || !this.ctx || !this.masterGain || targetFreq <= 0 || isNaN(targetFreq)) {
        return; // Still loading, failed, or invalid frequency
      }

      // Find the closest sample to minimize pitch shifting artifacts
      let closestNote = loadedNotes[0];
      let minRatioDiff = Infinity;

      for (const note of loadedNotes) {
        const sampleFreq = SAMPLE_NOTES[note as keyof typeof SAMPLE_NOTES];
        const ratioDiff = Math.abs(Math.log2(targetFreq / sampleFreq));
        if (ratioDiff < minRatioDiff) {
          minRatioDiff = ratioDiff;
          closestNote = note;
        }
      }

      const buffer = instBuffers[closestNote];
      const baseFreq = SAMPLE_NOTES[closestNote as keyof typeof SAMPLE_NOTES];
      
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      
      // Pitch shift from the closest sample
      source.playbackRate.value = targetFreq / baseFreq;

      const gainNode = this.ctx.createGain();
      
      // Envelope to prevent clicks and shape the release
      const safeStartTime = Math.max(startTime, this.ctx.currentTime);
      const attackTime = safeStartTime + 0.01;
      
      gainNode.gain.setValueAtTime(0, safeStartTime);
      gainNode.gain.linearRampToValueAtTime(1, attackTime);
      
      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start(safeStartTime);
      
      if (instrument === 'organ') {
        // Organ sustains at full volume, then releases quickly
        const releaseStart = Math.max(attackTime, safeStartTime + dur - 0.05);
        const releaseEnd = Math.max(releaseStart + 0.05, safeStartTime + dur);
        gainNode.gain.setValueAtTime(1, releaseStart);
        gainNode.gain.linearRampToValueAtTime(0.001, releaseEnd);
        source.stop(releaseEnd + 0.1);
      } else {
        // Piano/Guitar decay naturally, but we fade out gracefully at the end of the duration
        const releaseStart = Math.max(attackTime, safeStartTime + dur - 0.1);
        gainNode.gain.setTargetAtTime(0, releaseStart, 0.1);
        source.stop(releaseStart + 1.0); // Allow natural tail
      }
    } catch (e) {
      console.error("AudioEngine playSample error:", e);
    }
  }
}

export const audioEngine = new AudioEngine();
