import { describe, it, expect, beforeEach } from 'vitest';
import { processAudioBuffer, clearAudioCache } from './decode';

describe('processAudioBuffer', () => {
  beforeEach(() => {
    clearAudioCache();
  });

  it('processes stereo AudioBuffer into duration and downsampled peaks', () => {
    const channel0 = new Float32Array([0.2, 0.6, -0.8, 0.4]);
    const channel1 = new Float32Array([0.4, 0.4, -0.4, 0.2]);

    const mockAudioBuffer = {
      duration: 2.5,
      sampleRate: 44100,
      numberOfChannels: 2,
      getChannelData: (ch: number) => (ch === 0 ? channel0 : channel1),
    } as unknown as AudioBuffer;

    const result = processAudioBuffer(mockAudioBuffer, 2);

    expect(result.durationSeconds).toBe(2.5);
    expect(result.sampleRate).toBe(44100);
    expect(result.numberOfChannels).toBe(2);
    expect(result.peaks.length).toBe(2);

    // Channel 0 + 1 averaged:
    // sample 0: (0.2 + 0.4) / 2 = 0.3
    // sample 1: (0.6 + 0.4) / 2 = 0.5 -> Bucket 0 peak: 0.5
    // sample 2: (-0.8 + -0.4) / 2 = -0.6
    // sample 3: (0.4 + 0.2) / 2 = 0.3 -> Bucket 1 peak: 0.6
    expect(result.peaks[0]).toBeCloseTo(0.5, 5);
    expect(result.peaks[1]).toBeCloseTo(0.6, 5);
  });

  it('handles mono AudioBuffer with 1 channel correctly', () => {
    const channel0 = new Float32Array([0.1, -0.9, 0.3, 0.0]);

    const mockAudioBuffer = {
      duration: 1.0,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => channel0,
    } as unknown as AudioBuffer;

    const result = processAudioBuffer(mockAudioBuffer, 1);

    expect(result.durationSeconds).toBe(1.0);
    expect(result.numberOfChannels).toBe(1);
    expect(result.peaks.length).toBe(1);
    expect(result.peaks[0]).toBeCloseTo(0.9, 5);
  });
});
