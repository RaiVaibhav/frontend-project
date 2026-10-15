import { describe, it, expect } from 'vitest';
import { formatLrcTimestamp, exportLrc, parseLrc } from './lrc';
import type { AlignmentSegment, LyricLine } from '../types';

describe('formatLrcTimestamp', () => {
  it('formats ms to [mm:ss.xx]', () => {
    expect(formatLrcTimestamp(0)).toBe('[00:00.00]');
    expect(formatLrcTimestamp(12450)).toBe('[00:12.45]');
    expect(formatLrcTimestamp(65120)).toBe('[01:05.12]');
  });
});

describe('exportLrc', () => {
  it('generates valid LRC format sorted by start time', () => {
    const lines: LyricLine[] = [
      { id: '1', index: 0, text: 'First line of the song' },
      { id: '2', index: 1, text: 'Second line here' },
    ];

    const segments: AlignmentSegment[] = [
      { line_id: '2', start_ms: 15200, end_ms: 18000 },
      { line_id: '1', start_ms: 5000, end_ms: 9000 },
    ];

    const lrc = exportLrc({ title: 'Test Song', artist: 'Test Artist' }, lines, segments);

    expect(lrc).toContain('[ti:Test Song]');
    expect(lrc).toContain('[ar:Test Artist]');

    const textLines = lrc.split('\n').filter((l) => l.startsWith('[0'));
    expect(textLines.length).toBe(2);
    expect(textLines[0]).toBe('[00:05.00]First line of the song');
    expect(textLines[1]).toBe('[00:15.20]Second line here');
  });
});

describe('parseLrc', () => {
  it('correctly parses tags and timestamps into lines', () => {
    const lrcContent = `[ti:You Verse You]
[ar:AI Song]

[00:02.50]Paper lanterns in the yard
[00:07.80]I counted every window down
`;

    const parsed = parseLrc(lrcContent);

    expect(parsed.title).toBe('You Verse You');
    expect(parsed.artist).toBe('AI Song');
    expect(parsed.lines.length).toBe(2);
    expect(parsed.lines[0]).toEqual({ text: 'Paper lanterns in the yard', start_ms: 2500 });
    expect(parsed.lines[1]).toEqual({ text: 'I counted every window down', start_ms: 7800 });
  });
});
