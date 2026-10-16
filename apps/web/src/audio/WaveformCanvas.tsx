import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { AudioController } from './player';
import { calculateRulerTicks, pixelToTime } from './waveformUtils';

export interface WaveformCanvasProps {
  peaks: Float32Array;
  durationSeconds: number;
  controller: AudioController;
  zoom?: number;
  height?: number;
  segmentLaneHeight?: number;
  onDropLine?: (lineId: string, dropSeconds: number) => void;
  children?: React.ReactNode | ((totalWidth: number) => React.ReactNode);
}

export function WaveformCanvas({
  peaks,
  durationSeconds,
  controller,
  zoom = 1,
  height = 190,
  segmentLaneHeight = 50,
  onDropLine,
  children,
}: WaveformCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastUserScrollTimeRef = useRef<number>(0);

  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width responsively
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });

    observer.observe(el);
    setContainerWidth(el.clientWidth || 800);

    return () => observer.disconnect();
  }, []);

  const totalWidth = Math.max(containerWidth, Math.floor(containerWidth * zoom));
  const rulerHeight = 24;
  const laneH = segmentLaneHeight ?? 0;
  const waveformHeight = Math.max(40, height - rulerHeight - laneH);

  // 1. Draw static waveform peaks onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, totalWidth, height);

    // Draw ruler background and bottom border line
    ctx.fillStyle = 'rgba(128, 128, 128, 0.08)';
    ctx.fillRect(0, 0, totalWidth, rulerHeight);
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(totalWidth, rulerHeight);
    ctx.stroke();

    // Draw ruler tick marks & text
    const ticks = calculateRulerTicks(durationSeconds, 20);
    ctx.fillStyle = 'rgba(128, 128, 128, 0.7)';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';

    for (const tick of ticks) {
      const x = (tick.timeSeconds / durationSeconds) * totalWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();
      ctx.fillText(tick.label, x + 4, 16);
    }

    // Draw waveform bars centered in waveform lane
    const centerY = rulerHeight + waveformHeight / 2;
    const barCount = peaks.length;
    const barSpacing = totalWidth / barCount;
    const barWidth = Math.max(1.5, barSpacing * 0.7);

    ctx.fillStyle = 'rgba(99, 185, 140, 0.85)'; // Accent green tone matching design system

    for (let i = 0; i < barCount; i++) {
      const x = i * barSpacing;
      const amplitude = peaks[i];
      const barH = Math.max(2, amplitude * (waveformHeight - 16));

      // Symmetric vertical bar around baseline
      ctx.beginPath();
      ctx.roundRect
        ? ctx.roundRect(x, centerY - barH / 2, barWidth, barH, 1)
        : ctx.rect(x, centerY - barH / 2, barWidth, barH);
      ctx.fill();
    }

    // Draw subtle track separator and lane background for segment lane
    if (laneH > 0) {
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rulerHeight + waveformHeight);
      ctx.lineTo(totalWidth, rulerHeight + waveformHeight);
      ctx.stroke();

      ctx.fillStyle = 'rgba(128, 128, 128, 0.04)';
      ctx.fillRect(0, rulerHeight + waveformHeight, totalWidth, laneH);
    }
  }, [peaks, durationSeconds, totalWidth, height, rulerHeight, waveformHeight, laneH]);

  // 2. Hardware-accelerated playhead needle: Subscribes directly to 60fps audio ticks
  useEffect(() => {
    return controller.subscribeTime((timeSec) => {
      const needle = needleRef.current;
      if (!needle || durationSeconds <= 0) return;

      const progress = Math.max(0, Math.min(timeSec / durationSeconds, 1));
      const pixelX = progress * totalWidth;

      needle.style.transform = `translate3d(${pixelX}px, 0, 0)`;

      // Smooth continuous viewport tracking during playback when zoomed in
      if (containerRef.current && totalWidth > containerWidth) {
        const container = containerRef.current;
        const now = performance.now();
        // Cooldown: only auto-follow if user has not scrolled manually in the last 1800ms
        const isUserInteracting = now - lastUserScrollTimeRef.current < 1800;

        if (!isUserInteracting) {
          const viewportW = container.clientWidth;
          const targetScroll = Math.max(0, pixelX - viewportW * 0.38);

          if (pixelX > viewportW * 0.38 && Math.abs(container.scrollLeft - targetScroll) > 1) {
            container.scrollLeft = targetScroll;
          } else if (pixelX < container.scrollLeft) {
            // Backward seek: jump container back to keep needle visible
            container.scrollLeft = Math.max(0, pixelX - 40);
          }
        }
      }
    });
  }, [controller, durationSeconds, totalWidth, containerWidth]);

  // Smooth wheel & trackpad horizontal scrolling with momentum friction decay
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelVelocity = 0;
    let rafId: number | null = null;

    const applyMomentum = () => {
      if (!containerRef.current) return;
      if (Math.abs(wheelVelocity) < 0.2) {
        wheelVelocity = 0;
        rafId = null;
        return;
      }
      containerRef.current.scrollLeft += wheelVelocity * 0.22;
      wheelVelocity *= 0.84; // Smooth friction decay
      rafId = requestAnimationFrame(applyMomentum);
    };

    const handleWheel = (e: WheelEvent) => {
      if (container.scrollWidth <= container.clientWidth) return;

      lastUserScrollTimeRef.current = performance.now();

      // If holding shift or using a vertical wheel (which sends deltaY)
      const isShift = e.shiftKey;
      const isVerticalWheel = Math.abs(e.deltaY) > Math.abs(e.deltaX);

      if (isShift || isVerticalWheel) {
        e.preventDefault();
        const rawDelta = isShift ? (e.deltaX || e.deltaY) : e.deltaY;
        const multiplier = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 100 : 1;
        const delta = rawDelta * multiplier;

        wheelVelocity += delta;
        wheelVelocity = Math.max(-120, Math.min(120, wheelVelocity));

        if (!rafId) {
          rafId = requestAnimationFrame(applyMomentum);
        }
      }
    };

    const handleScroll = () => {
      lastUserScrollTimeRef.current = performance.now();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [totalWidth, containerWidth]);

  // 3. Click and Drag to Seek, with Middle-Click / Alt-Drag Pan support
  const handleSeekFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || durationSeconds <= 0) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const targetSeconds = pixelToTime(clickX, totalWidth, durationSeconds);

      controller.seek(targetSeconds);
    },
    [controller, durationSeconds, totalWidth]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. Middle-click (button 1) or Alt+LeftClick for smooth drag-to-pan across the timeline
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const startX = e.clientX;
      const startScrollLeft = container.scrollLeft;
      document.body.style.cursor = 'grabbing';

      const handlePanMove = (moveEvt: MouseEvent) => {
        lastUserScrollTimeRef.current = performance.now();
        const dx = moveEvt.clientX - startX;
        container.scrollLeft = startScrollLeft - dx;
      };

      const handlePanUp = () => {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanUp);
      };

      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanUp);
      return;
    }

    // 2. Left click: primary seek and scrub
    if (e.button !== 0) return;
    lastUserScrollTimeRef.current = 0; // Seeking immediately re-engages needle auto-centering
    isDraggingRef.current = true;
    handleSeekFromEvent(e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSeekFromEvent(moveEvent);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const lineId = e.dataTransfer.getData('text/plain');
    const canvas = canvasRef.current;
    if (!lineId || !canvas || durationSeconds <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropSeconds = pixelToTime(dropX, totalWidth, durationSeconds);
    if (onDropLine) {
      onDropLine(lineId, dropSeconds);
    }
  };

  return (
    <div
      ref={containerRef}
      className="waveform-scroll-container"
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        overflowX: 'auto',
        overflowY: 'hidden',
        overscrollBehaviorX: 'contain',
        background: 'var(--surface)',
        borderRadius: 0,
        border: '1px solid var(--border)',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={{ position: 'relative', width: `${totalWidth}px`, height: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block', cursor: 'pointer' }} />

        {/* 60fps hardware-accelerated playhead needle */}
        <div
          ref={needleRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            backgroundColor: '#ef4444', // Prominent red playhead needle
            cursor: 'ew-resize',
            pointerEvents: 'auto',
            zIndex: 10,
            transform: 'translate3d(0, 0, 0)',
            willChange: 'transform',
          }}
        >
          {/* Top Scrubber Cap */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-6px',
              width: '14px',
              height: '14px',
              backgroundColor: '#ef4444',
              borderRadius: '2px',
              cursor: 'ew-resize',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            }}
          />
        </div>

        {/* Child overlay slots (e.g. Segment Lane blocks) */}
        {typeof children === 'function' ? children(totalWidth) : children}
      </div>
    </div>
  );
}
