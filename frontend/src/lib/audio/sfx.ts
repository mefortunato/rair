// Web Audio API Procedural Synthesizer for RAIR

class SoundEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	public enabled: boolean = true;
	public volume: number = 0.35;

	private initContext() {
		if (!this.ctx && typeof window !== 'undefined') {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			if (AudioContextClass) {
				this.ctx = new AudioContextClass();
				this.masterGain = this.ctx.createGain();
				this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
				this.masterGain.connect(this.ctx.destination);
			}
		}
		if (this.ctx && this.ctx.state === 'suspended') {
			this.ctx.resume();
		}
	}

	public toggleSound(val?: boolean) {
		this.enabled = val !== undefined ? val : !this.enabled;
		return this.enabled;
	}

	public setVolume(vol: number) {
		this.volume = Math.max(0, Math.min(1, vol));
		if (this.masterGain && this.ctx) {
			this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
		}
	}

	public playSlash() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(320, now);
		osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.12);
	}

	public playCrit() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const now = this.ctx.currentTime;
		// Punchy dual tone
		[440, 880].forEach((freq) => {
			if (!this.ctx || !this.masterGain) return;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, now);
			osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);

			gain.gain.setValueAtTime(0.3, now);
			gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(now);
			osc.stop(now + 0.25);
		});
	}

	public playGold() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(987.77, now); // B5
		osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

		gain.gain.setValueAtTime(0.15, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.18);
	}

	public playRuneChime(element: string) {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		const freqs: Record<string, number> = {
			fire: 523.25, // C5
			ice: 659.25, // E5
			lightning: 783.99, // G5
			void: 987.77 // B5
		};

		osc.type = 'sine';
		osc.frequency.setValueAtTime(freqs[element] || 523.25, now);

		gain.gain.setValueAtTime(0.25, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.35);
	}

	public playLevelUp() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
		const now = this.ctx.currentTime;

		notes.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			const startTime = now + idx * 0.06;

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0.2, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(startTime);
			osc.stop(startTime + 0.15);
		});
	}

	public playMinigameSuccess() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
		const now = this.ctx.currentTime;

		notes.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			const startTime = now + idx * 0.05;

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0.2, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(startTime);
			osc.stop(startTime + 0.2);
		});
	}

	public playMinigameMiss() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(140, now);
		osc.frequency.linearRampToValueAtTime(80, now + 0.2);

		gain.gain.setValueAtTime(0.2, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.2);
	}

	public playAscension() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		const chord = [261.63, 329.63, 392.0, 523.25, 659.25]; // Major triad celestial shimmer
		const now = this.ctx.currentTime;

		chord.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			const startTime = now + idx * 0.08;

			osc.type = 'sine';
			osc.frequency.setValueAtTime(freq, startTime);
			osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 1.2);

			gain.gain.setValueAtTime(0.25, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(startTime);
			osc.stop(startTime + 1.2);
		});
	}

	public playBossDefeat() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		// Heroic ascending fanfare
		const notes = [392.0, 523.25, 659.25, 783.99, 1046.5]; // G4, C5, E5, G5, C6
		const now = this.ctx.currentTime;

		notes.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			const startTime = now + idx * 0.07;

			osc.type = 'triangle';
			osc.frequency.setValueAtTime(freq, startTime);

			gain.gain.setValueAtTime(0.25, startTime);
			gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

			osc.connect(gain);
			gain.connect(this.masterGain);

			osc.start(startTime);
			osc.stop(startTime + 0.35);
		});
	}

	public playPerkSelect() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		// Resonant celestial sparkle
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sine';
		osc.frequency.setValueAtTime(587.33, now); // D5
		osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6
		osc.frequency.exponentialRampToValueAtTime(1760.0, now + 0.3); // A6

		gain.gain.setValueAtTime(0.25, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.45);
	}

	public playReroll() {
		if (!this.enabled) return;
		this.initContext();
		if (!this.ctx || !this.masterGain) return;

		// Card reshuffle whoosh
		const now = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();

		osc.type = 'sawtooth';
		osc.frequency.setValueAtTime(400, now);
		osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
		osc.frequency.exponentialRampToValueAtTime(300, now + 0.18);

		gain.gain.setValueAtTime(0.18, now);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

		osc.connect(gain);
		gain.connect(this.masterGain);

		osc.start(now);
		osc.stop(now + 0.18);
	}
}

export const sfx = new SoundEngine();
