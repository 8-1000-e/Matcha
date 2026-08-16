"use client";

const PATTERN_MS = 2400;
const BEEP_MS = 380;
const GAP_MS = 220;
const FREQUENCIES = [660, 880];
const VOLUME = 0.05;

type AudioContextConstructor = new () => AudioContext;

function contextClass(): AudioContextConstructor | null {
	const scope = window as unknown as {
		AudioContext?: AudioContextConstructor;
		webkitAudioContext?: AudioContextConstructor;
	};
	return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

export function startRingtone(): () => void {
	const Constructor = contextClass();
	if (Constructor === null) {
		return () => undefined;
	}

	let context: AudioContext;
	try {
		context = new Constructor();
	} catch {
		return () => undefined;
	}

	function beep(frequency: number, at: number): void {
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = frequency;
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(VOLUME, at + 0.03);
		gain.gain.setValueAtTime(VOLUME, at + BEEP_MS / 1000 - 0.05);
		gain.gain.linearRampToValueAtTime(0, at + BEEP_MS / 1000);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start(at);
		oscillator.stop(at + BEEP_MS / 1000);
	}

	function cycle(): void {
		const now = context.currentTime;
		FREQUENCIES.forEach((frequency, index) => {
			beep(frequency, now + index * ((BEEP_MS + GAP_MS) / 1000));
		});
	}

	void context.resume().catch(() => undefined);
	cycle();
	const timer = window.setInterval(cycle, PATTERN_MS);

	return () => {
		window.clearInterval(timer);
		void context.close().catch(() => undefined);
	};
}
