import { extractPeaks, mergeStereoToMono } from './peaks';

export interface DecodedAudioResult {
  durationSeconds: number;
  peaks: Float32Array;
  sampleRate: number;
  numberOfChannels: number;
}

// In-memory cache to avoid re-decoding the same audio file twice
const cache = new Map<string, DecodedAudioResult>();

let sharedAudioContext: AudioContext | null = null;

/**
 * Returns a shared browser AudioContext instance.
 * Reuses the same context across the application lifecycle to avoid hitting browser limits.
 */
export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    // Browsers often suspend AudioContext until user interaction
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Decodes an ArrayBuffer of audio file bytes (MP3, WAV, OGG) into an AudioBuffer.
 */
export async function decodeAudioBuffer(arrayBuffer: ArrayBuffer, audioCtx = getAudioContext()): Promise<AudioBuffer> {
  // decodeAudioData detaches the underlying ArrayBuffer, so clone if re-use is needed
  return new Promise<AudioBuffer>((resolve, reject) => {
    const promise = audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    if (promise && typeof promise.then === 'function') {
      promise.then(resolve).catch(reject);
    }
  });
}

/**
 * Processes an AudioBuffer into our DecodedAudioResult with normalized peaks.
 */
export function processAudioBuffer(audioBuffer: AudioBuffer, targetBarCount = 800): DecodedAudioResult {
  const channel0 = audioBuffer.getChannelData(0);
  const channel1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : undefined;

  // Merge stereo channels into a single mono wave
  const monoSamples = mergeStereoToMono(channel0, channel1);

  // Extract visual peaks
  const peaks = extractPeaks(monoSamples, targetBarCount);

  return {
    durationSeconds: audioBuffer.duration,
    peaks,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
  };
}

/**
 * Fetches and decodes an audio file from a URL, returning duration and visual peaks.
 * Results are cached by URL.
 */
export async function decodeAudioFromUrl(
  url: string,
  targetBarCount = 800,
  audioCtx = getAudioContext()
): Promise<DecodedAudioResult> {
  const cached = cache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio from "${url}" (HTTP ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await decodeAudioBuffer(arrayBuffer, audioCtx);
  const result = processAudioBuffer(audioBuffer, targetBarCount);

  cache.set(url, result);
  return result;
}

/**
 * Decodes a user-provided audio File (from drag-and-drop or file picker) into visual peaks.
 */
export async function decodeAudioFromFile(
  file: File,
  targetBarCount = 800,
  audioCtx = getAudioContext()
): Promise<DecodedAudioResult> {
  const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await decodeAudioBuffer(arrayBuffer, audioCtx);
  const result = processAudioBuffer(audioBuffer, targetBarCount);

  cache.set(cacheKey, result);
  return result;
}

/**
 * Clears the audio decode cache (useful for memory cleanup or testing).
 */
export function clearAudioCache(): void {
  cache.clear();
}
