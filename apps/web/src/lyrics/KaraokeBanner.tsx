import { useEffect, useState, useRef, useMemo } from 'react';
import { Mic2 } from 'lucide-react';
import type { LyricLine, AlignmentSegment } from '../types';
import type { AudioController } from '../audio/player';
import { getKaraokeContext, type KaraokeContext } from './lyricsUtils';
import { formatTimeShort } from '../utils/time';

export interface KaraokeBannerProps {
  lines: LyricLine[];
  segments: AlignmentSegment[];
  controller: AudioController;
  onSeekToTime?: (timeSeconds: number) => void;
}

export function KaraokeBanner({
  lines,
  segments,
  controller,
  onSeekToTime,
}: KaraokeBannerProps) {
  const [context, setContext] = useState<KaraokeContext>(() =>
    getKaraokeContext(lines, segments, 0)
  );

  const lastKeyRef = useRef<string>('');

  // Map for fast segment lookup to format line timing and allow click-to-seek
  const segmentMap = useMemo(() => {
    const map = new Map<string, AlignmentSegment>();
    for (const seg of segments) {
      map.set(seg.line_id, seg);
    }
    return map;
  }, [segments]);

  // Decoupled playback subscription: updates React state ONLY when line transitions happen
  useEffect(() => {
    // Reset key on lines/segments changes
    lastKeyRef.current = '';

    return controller.subscribeTime((timeSec) => {
      const timeMs = Math.round(timeSec * 1000);
      const ctx = getKaraokeContext(lines, segments, timeMs);
      const key = `${ctx.prevLine?.id ?? ''}|${ctx.currentLine?.id ?? ''}|${ctx.nextLine?.id ?? ''}`;

      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setContext(ctx);
      }
    });
  }, [controller, lines, segments]);

  const handleLineClick = (lineId: string) => {
    const seg = segmentMap.get(lineId);
    if (seg && onSeekToTime) {
      onSeekToTime(seg.start_ms / 1000);
    }
  };

  const currentSegment = context.currentLine ? segmentMap.get(context.currentLine.id) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        padding: 'var(--space-3) var(--space-4)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Teleprompter Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(128, 128, 128, 0.15)',
          paddingBottom: 'var(--space-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Mic2 size={13} style={{ color: 'var(--accent)' }} />
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            Karaoke Teleprompter
          </span>
        </div>

        {context.currentLine && currentSegment && (
          <span
            style={{
              fontSize: '0.72rem',
              fontFamily: 'ui-monospace, monospace',
              color: 'var(--accent)',
              background: 'rgba(99, 185, 140, 0.12)',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(99, 185, 140, 0.3)',
            }}
          >
            {formatTimeShort(currentSegment.start_ms)} – {formatTimeShort(currentSegment.end_ms)}
          </span>
        )}
      </div>

      {/* 3-Line Teleprompter Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '90px',
          gap: '6px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {/* 1. Previous Line (Muted, top) */}
        <div
          onClick={() => context.prevLine && handleLineClick(context.prevLine.id)}
          title={context.prevLine ? `Previous: "${context.prevLine.text}" (Click to jump)` : undefined}
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.35,
            color: 'var(--text-muted)',
            opacity: context.prevLine ? 0.6 : 0,
            cursor: context.prevLine && segmentMap.has(context.prevLine.id) ? 'pointer' : 'default',
            minHeight: '1.2rem',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            padding: '0 var(--space-2)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {context.prevLine?.text || '—'}
        </div>

        {/* 2. Active Center Line (Prominent, bold, large, wraps cleanly if long) */}
        <div
          onClick={() => context.currentLine && handleLineClick(context.currentLine.id)}
          title={context.currentLine ? `Active: "${context.currentLine.text}" (Click to replay)` : undefined}
          style={{
            fontSize: 'clamp(1.1rem, 1.8vw, 1.25rem)',
            fontWeight: 700,
            lineHeight: 1.38,
            color: context.currentLine ? 'var(--text)' : 'var(--text-muted)',
            fontStyle: context.currentLine ? 'normal' : 'italic',
            minHeight: '1.8rem',
            display: 'block',
            textAlign: 'center',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            padding: '2px var(--space-3)',
            cursor: context.currentLine ? 'pointer' : 'default',
            textShadow: context.currentLine ? '0 0 16px rgba(99, 185, 140, 0.25)' : 'none',
            letterSpacing: context.currentLine ? '0.01em' : 'normal',
            transition: 'color 0.2s ease, transform 0.2s ease',
          }}
        >
          {context.currentLine ? (
            context.currentLine.text
          ) : context.nextLine ? (
            <span style={{ color: 'var(--accent)', opacity: 0.85, fontSize: '0.98rem' }}>
              ♪ (Instrumental — next line coming up) ♪
            </span>
          ) : (
            <span style={{ opacity: 0.6, fontSize: '0.95rem' }}>♪ (End of track) ♪</span>
          )}
        </div>

        {/* 3. Upcoming Line (Muted, bottom) */}
        <div
          onClick={() => context.nextLine && handleLineClick(context.nextLine.id)}
          title={context.nextLine ? `Upcoming: "${context.nextLine.text}" (Click to jump)` : undefined}
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.35,
            color: 'var(--text-muted)',
            opacity: context.nextLine ? 0.6 : 0,
            cursor: context.nextLine && segmentMap.has(context.nextLine.id) ? 'pointer' : 'default',
            minHeight: '1.2rem',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxWidth: '100%',
            padding: '0 var(--space-2)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {context.nextLine?.text || '—'}
        </div>
      </div>
    </div>
  );
}
