/**
 * AudioController: Low-latency audio transport manager.
 *
 * Performance guarantee (per .agents/AGENTS.md):
 * - Decouples high-frequency 60Hz playback ticks from React component state.
 * - Components needing 60fps scrubbing (canvas waveform, playhead needle, clock readout)
 *   subscribe directly via `subscribeTime((timeSeconds) => ...)`.
 * - React state only updates for low-frequency events: play, pause, track load, duration change.
 */

export type TimeListener = (timeSeconds: number) => void;
export type StateListener = (isPlaying: boolean) => void;

export class AudioController {
  private audio: HTMLAudioElement;
  private timeListeners = new Set<TimeListener>();
  private stateListeners = new Set<StateListener>();
  private _isPlaying = false;
  private _duration = 0;
  private rafId: number | null = null;

  constructor(initialAudio?: HTMLAudioElement) {
    if (initialAudio) {
      this.audio = initialAudio;
    } else if (typeof Audio !== 'undefined') {
      this.audio = new Audio();
    } else {
      // Fallback for non-browser / test environments
      this.audio = {
        play: async () => {},
        pause: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        currentTime: 0,
        duration: 0,
        src: '',
      } as unknown as HTMLAudioElement;
    }

    this.setupListeners();
  }

  private setupListeners(): void {
    this.audio.addEventListener('play', () => this.handlePlayChange(true));
    this.audio.addEventListener('pause', () => this.handlePlayChange(false));
    this.audio.addEventListener('ended', () => this.handlePlayChange(false));

    this.audio.addEventListener('durationchange', () => {
      if (Number.isFinite(this.audio.duration)) {
        this._duration = this.audio.duration;
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(this.audio.duration)) {
        this._duration = this.audio.duration;
      }
    });
  }

  private handlePlayChange(playing: boolean): void {
    if (this._isPlaying === playing) return;
    this._isPlaying = playing;

    // Notify low-frequency state listeners (React setState)
    for (const listener of this.stateListeners) {
      listener(this._isPlaying);
    }

    if (this._isPlaying) {
      this.startTimeLoop();
    } else {
      this.stopTimeLoop();
      // Emit final position when stopping
      this.notifyTime(this.getCurrentTime());
    }
  }

  private startTimeLoop(): void {
    if (this.rafId !== null) return;

    const tick = () => {
      this.notifyTime(this.getCurrentTime());
      if (this._isPlaying) {
        this.rafId = typeof requestAnimationFrame !== 'undefined'
          ? requestAnimationFrame(tick)
          : null;
      } else {
        this.rafId = null;
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  private stopTimeLoop(): void {
    if (this.rafId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = null;
    }
  }

  private notifyTime(timeSeconds: number): void {
    for (const listener of this.timeListeners) {
      listener(timeSeconds);
    }
  }

  /**
   * Loads an audio source URL (can be an HTTP endpoint or a local URL.createObjectURL).
   */
  public load(src: string): void {
    this.pause();
    this.audio.src = src;
    this.audio.currentTime = 0;
    this._duration = 0;
    this.notifyTime(0);
  }

  public async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (err) {
      // Autoplay prevention or user gesture requirements
      this.handlePlayChange(false);
      throw err;
    }
  }

  public pause(): void {
    this.audio.pause();
  }

  public async togglePlay(): Promise<void> {
    if (this._isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  public seek(timeSeconds: number): void {
    const clampedTime = Math.max(0, timeSeconds);
    this.audio.currentTime = clampedTime;
    this.notifyTime(clampedTime);
  }

  public getCurrentTime(): number {
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    return this._duration || this.audio.duration || 0;
  }

  public get isPlaying(): boolean {
    return this._isPlaying;
  }

  public get element(): HTMLAudioElement {
    return this.audio;
  }

  /**
   * Subscribes to high-frequency (60fps) playback time changes.
   * Returns an unsubscribe function.
   */
  public subscribeTime(listener: TimeListener): () => void {
    this.timeListeners.add(listener);
    // Immediately emit current time to the new listener
    listener(this.getCurrentTime());
    return () => {
      this.timeListeners.delete(listener);
    };
  }

  /**
   * Subscribes to low-frequency play/pause state changes.
   * Returns an unsubscribe function.
   */
  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this._isPlaying);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public destroy(): void {
    this.stopTimeLoop();
    this.pause();
    this.timeListeners.clear();
    this.stateListeners.clear();
  }
}
