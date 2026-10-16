import { describe, it, expect } from 'vitest';
import { extractPeaks, mergeStereoToMono } from './peaks';

describe('extractPeaks', () => {
  it('returns empty array when input is empty or targetBarCount <= 0', () => {
    expect(extractPeaks(new Float32Array(0), 100).length).toBe(0);
    expect(extractPeaks(new Float32Array([0.5, 0.2]), 0).length).toBe(0);
  });

  it('downsamples audio samples and finds the maximum peak per bucket', () => {
    // 8 samples divided into 2 buckets (4 samples each)
    // Bucket 1: [0.1, 0.4, -0.6, 0.2] -> highest absolute is 0.6
    // Bucket 2: [-0.2, 0.85, 0.3, -0.1] -> highest absolute is 0.85
    const samples = new Float32Array([0.1, 0.4, -0.6, 0.2, -0.2, 0.85, 0.3, -0.1]);
    const peaks = extractPeaks(samples, 2);

    expect(peaks.length).toBe(2);
    expect(peaks[0]).toBeCloseTo(0.6, 5);
    expect(peaks[1]).toBeCloseTo(0.85, 5);
  });

  it('clamps values above 1.0 down to 1.0', () => {
    const samples = new Float32Array([1.5, -2.0, 0.5, 0.0]);
    const peaks = extractPeaks(samples, 1);

    expect(peaks.length).toBe(1);
    expect(peaks[0]).toBe(1.0);
  });

  it('handles small sample arrays gracefully when samples <= targetBarCount', () => {
    const samples = new Float32Array([0.2, -0.7]);
    const peaks = extractPeaks(samples, 10);

    expect(peaks.length).toBe(2);
    expect(peaks[0]).toBeCloseTo(0.2, 5);
    expect(peaks[1]).toBeCloseTo(0.7, 5);
  });
});

describe('mergeStereoToMono', () => {
  it('returns left channel if right channel is not provided', () => {
    const left = new Float32Array([0.4, 0.8]);
    expect(mergeStereoToMono(left)).toBe(left);
  });

  it('averages left and right channels', () => {
    const left = new Float32Array([0.4, -0.6]);
    const right = new Float32Array([0.2, -0.2]);
    const mono = mergeStereoToMono(left, right);

    expect(mono.length).toBe(2);
    expect(mono[0]).toBeCloseTo(0.3, 5);
    expect(mono[1]).toBeCloseTo(-0.4, 5);
  });
});
