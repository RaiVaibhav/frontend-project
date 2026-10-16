import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioController, type TimeListener } from './player';

export interface UseAudioPlayerReturn {
  controller: AudioController;
  isPlaying: boolean;
  duration: number;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (timeSeconds: number) => void;
  load: (src: string) => void;
  subscribeTime: (listener: TimeListener) => () => void;
  getCurrentTime: () => number;
}

/**
 * React hook connecting component lifecycle to AudioController.
 *
 * Performance note:
 * Does NOT update React state on 60fps clock ticks.
 * Components that need 60Hz playhead rendering (canvas, teleprompter, scrubber)
 * should use `subscribeTime` or `controller.subscribeTime`.
 */
export function useAudioPlayer(initialSrc?: string): UseAudioPlayerReturn {
  const controllerRef = useRef<AudioController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = new AudioController();
  }

  const controller = controllerRef.current;

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Sync React state on low-frequency play/pause events
    const unsubState = controller.subscribeState((playing) => {
      setIsPlaying(playing);
      setDuration(controller.getDuration());
    });

    const audioEl = controller.element;
    const handleDuration = () => {
      setDuration(controller.getDuration());
    };

    audioEl.addEventListener('durationchange', handleDuration);
    audioEl.addEventListener('loadedmetadata', handleDuration);

    if (initialSrc) {
      controller.load(initialSrc);
    }

    return () => {
      unsubState();
      audioEl.removeEventListener('durationchange', handleDuration);
      audioEl.removeEventListener('loadedmetadata', handleDuration);
    };
  }, [controller, initialSrc]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      controller.destroy();
    };
  }, [controller]);

  const play = useCallback(() => controller.play(), [controller]);
  const pause = useCallback(() => controller.pause(), [controller]);
  const togglePlay = useCallback(() => controller.togglePlay(), [controller]);
  const seek = useCallback((time: number) => controller.seek(time), [controller]);
  const load = useCallback((src: string) => controller.load(src), [controller]);
  const subscribeTime = useCallback((listener: TimeListener) => controller.subscribeTime(listener), [controller]);
  const getCurrentTime = useCallback(() => controller.getCurrentTime(), [controller]);

  return {
    controller,
    isPlaying,
    duration,
    play,
    pause,
    togglePlay,
    seek,
    load,
    subscribeTime,
    getCurrentTime,
  };
}
