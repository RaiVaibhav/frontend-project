import { useEffect, useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { api, ApiError } from './api';
import type { TrackData } from './types';
import { useAudioPlayer } from './audio/useAudioPlayer';
import { decodeAudioFromUrl } from './audio/decode';
import { WaveformCanvas } from './audio/WaveformCanvas';
import { TimeClock } from './audio/TimeClock';

export default function App() {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [isDecodingAudio, setIsDecodingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPlaying, togglePlay, load, controller } = useAudioPlayer();

  // Fetch initial track from API
  useEffect(() => {
    let live = true;

    api<TrackData>('/api/v1/track')
      .then((t) => {
        if (!live) return;
        setTrack(t);
        load(t.audio_url);

        // Fetch and decode audio samples for waveform visualization
        setIsDecodingAudio(true);
        decodeAudioFromUrl(t.audio_url)
          .then((res) => {
            if (live) {
              setPeaks(res.peaks);
              setIsDecodingAudio(false);
            }
          })
          .catch((err) => {
            console.error('Audio decode failed:', err);
            if (live) setIsDecodingAudio(false);
          });
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof ApiError ? `${e.message} ${JSON.stringify(e.body)}` : String(e));
      });

    return () => {
      live = false;
    };
  }, [load]);

  if (error) return <p style={{ color: 'var(--danger)', padding: 'var(--space-4)' }}>{error}</p>;
  if (!track) return <p style={{ padding: 'var(--space-4)' }}>Loading track…</p>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Top Header & Transport Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
        }}
      >
        {/* Track Title and Artist */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius)',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-contrast)',
            }}
          >
            <Music size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', margin: 0 }}>{track.title}</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {track.artist} · {track.lines.length} lines
            </p>
          </div>
        </div>

        {/* Center Playback Transport */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => togglePlay()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <TimeClock controller={controller} durationSeconds={track.duration_seconds} />
        </div>
      </header>

      {/* Main Waveform Timeline Section */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          background: 'var(--surface)',
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Waveform & Timeline
          </h2>
          {isDecodingAudio && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Decoding audio peaks…
            </span>
          )}
        </div>

        {peaks ? (
          <WaveformCanvas
            peaks={peaks}
            durationSeconds={track.duration_seconds}
            controller={controller}
            height={160}
          />
        ) : (
          <div
            style={{
              height: '160px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(128,128,128,0.05)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            {isDecodingAudio ? 'Extracting waveform peaks…' : 'Loading audio…'}
          </div>
        )}
      </section>
    </div>
  );
}
