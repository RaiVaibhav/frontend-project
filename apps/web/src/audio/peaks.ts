/**
 * Pure Audio Peak Extraction Utilities.
 *
 * Concepts for digital audio:
 * - Sample: A single measurement of sound pressure, represented as a float from -1.0 to +1.0.
 * - Sample Rate: Typically 44,100 samples per second. A 2-minute song contains ~5.3 million samples.
 * - Channel: Left speaker = channel 0, Right speaker = channel 1.
 * - Peak / Downsampling: Screens are only ~1000-2000 pixels wide. We divide millions of samples
 *   into a fixed number of "buckets" (e.g. 800 bars) and find the loudest peak in each bucket
 *   so the browser can draw the waveform effortlessly without lagging.
 */

export interface PeakExtractionOptions {
  /**
   * Number of visual bars/buckets to produce across the song duration.
   * Typically 400 to 1200 depending on screen width/zoom.
   */
  targetBarCount: number;
}

/**
 * Extracts normalized amplitude peaks (0.0 to 1.0) from raw audio channel samples.
 *
 * @param channelData Float32Array of raw PCM audio samples (-1.0 to +1.0).
 * @param targetBarCount How many peak values to return.
 * @returns Float32Array containing `targetBarCount` normalized values between 0.0 and 1.0.
 */
export function extractPeaks(channelData: Float32Array, targetBarCount: number): Float32Array {
  // Edge case: Empty or invalid input
  if (!channelData || channelData.length === 0 || targetBarCount <= 0) {
    return new Float32Array(0);
  }

  const sampleCount = channelData.length;
  // If we have fewer audio samples than target bars, return raw absolute values
  if (sampleCount <= targetBarCount) {
    const result = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      result[i] = Math.min(1, Math.abs(channelData[i]));
    }
    return result;
  }

  const peaks = new Float32Array(targetBarCount);
  // How many audio samples belong in each visual bar bucket
  const samplesPerBucket = sampleCount / targetBarCount;

  for (let bar = 0; bar < targetBarCount; bar++) {
    const bucketStart = Math.floor(bar * samplesPerBucket);
    const bucketEnd = Math.floor((bar + 1) * samplesPerBucket);

    let maxAmplitude = 0;

    // Scan through all audio samples in this bucket and find the highest peak
    for (let s = bucketStart; s < bucketEnd; s++) {
      const absValue = Math.abs(channelData[s]);
      if (absValue > maxAmplitude) {
        maxAmplitude = absValue;
      }
    }

    // Clamp between 0.0 and 1.0
    peaks[bar] = Math.min(1, maxAmplitude);
  }

  return peaks;
}

/**
 * Helper to merge stereo channels (left + right) into a single mono Float32Array.
 * If only one channel is provided, it returns that channel directly.
 */
export function mergeStereoToMono(leftChannel: Float32Array, rightChannel?: Float32Array): Float32Array {
  if (!rightChannel || rightChannel.length === 0) {
    return leftChannel;
  }

  const length = Math.min(leftChannel.length, rightChannel.length);
  const mono = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    // Average left and right channel samples
    mono[i] = (leftChannel[i] + rightChannel[i]) / 2;
  }

  return mono;
}
