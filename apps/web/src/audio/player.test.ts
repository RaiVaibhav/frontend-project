import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioController } from './player';

describe('AudioController', () => {
  let mockAudio: HTMLAudioElement;
  let listeners: Record<string, (() => void)[]>;

  beforeEach(() => {
    listeners = {};

    mockAudio = {
      src: '',
      currentTime: 0,
      duration: 125,
      play: vi.fn(async () => {
        // Trigger play event
        listeners['play']?.forEach((fn) => fn());
      }),
      pause: vi.fn(() => {
        // Trigger pause event
        listeners['pause']?.forEach((fn) => fn());
      }),
      addEventListener: vi.fn((event: string, fn: () => void) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      }),
      removeEventListener: vi.fn((event: string, fn: () => void) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((f) => f !== fn);
        }
      }),
    } as unknown as HTMLAudioElement;
  });

  it('initializes with default values and sets up event listeners', () => {
    const controller = new AudioController(mockAudio);
    expect(controller.isPlaying).toBe(false);
    expect(controller.getCurrentTime()).toBe(0);
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
  });

  it('updates state and notifies subscribers on play and pause', async () => {
    const controller = new AudioController(mockAudio);
    const stateSpy = vi.fn();
    controller.subscribeState(stateSpy);

    // Initial state notification
    expect(stateSpy).toHaveBeenCalledWith(false);

    await controller.play();
    expect(controller.isPlaying).toBe(true);
    expect(stateSpy).toHaveBeenCalledWith(true);

    controller.pause();
    expect(controller.isPlaying).toBe(false);
    expect(stateSpy).toHaveBeenCalledWith(false);
  });

  it('seek updates currentTime and notifies time subscribers', () => {
    const controller = new AudioController(mockAudio);
    const timeSpy = vi.fn();
    controller.subscribeTime(timeSpy);

    // Initial time notification
    expect(timeSpy).toHaveBeenCalledWith(0);

    controller.seek(42.5);
    expect(mockAudio.currentTime).toBe(42.5);
    expect(timeSpy).toHaveBeenCalledWith(42.5);
  });

  it('load resets currentTime and sets new audio source', () => {
    const controller = new AudioController(mockAudio);
    controller.seek(30);
    controller.load('/api/audio/test.mp3');

    expect(mockAudio.src).toBe('/api/audio/test.mp3');
    expect(mockAudio.currentTime).toBe(0);
  });

  it('unsubscribe stops receiving updates', () => {
    const controller = new AudioController(mockAudio);
    const timeSpy = vi.fn();
    const unsub = controller.subscribeTime(timeSpy);

    timeSpy.mockClear();
    unsub();

    controller.seek(15);
    expect(timeSpy).not.toHaveBeenCalled();
  });
});
