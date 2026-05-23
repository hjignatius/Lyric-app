/**
 * ChordPro parser — converts ChordPro text into structured line objects.
 *
 * ChordPro format: [G]Amazing [D]grace, how [Em]sweet the [C]sound
 * Result: array of "segments" per line, each segment has { chord, text }
 */

export function parseChordPro(text) {
  const lines = text.split('\n');
  return lines.map(parseLine);
}

function parseLine(line) {
  // Directive lines: {title: ...}, {artist: ...}, etc.
  const directiveMatch = line.match(/^\{(.+?):\s*(.+?)\}$/);
  if (directiveMatch) {
    return { type: 'directive', key: directiveMatch[1].trim(), value: directiveMatch[2].trim() };
  }

  // Comment lines
  if (line.startsWith('#')) {
    return { type: 'comment', text: line.slice(1).trim() };
  }

  // Empty lines = section break
  if (line.trim() === '') {
    return { type: 'empty' };
  }

  // Check if the line contains chords
  const chordPattern = /\[([^\]]+)\]/;
  if (!chordPattern.test(line)) {
    // Plain lyric line with no chords
    return { type: 'lyrics', segments: [{ chord: null, text: line }] };
  }

  // Parse inline chords
  const segments = [];
  let remaining = line;
  const regex = /\[([^\]]+)\]([^\[]*)/g;
  let lastIndex = 0;
  let firstMatch = true;

  // Handle any leading text before first chord
  const firstChordIndex = line.indexOf('[');
  if (firstChordIndex > 0) {
    segments.push({ chord: null, text: line.slice(0, firstChordIndex) });
  }

  let match;
  while ((match = regex.exec(line)) !== null) {
    segments.push({ chord: match[1], text: match[2] });
  }

  return { type: 'chords', segments };
}

export function hasChords(parsedLines) {
  return parsedLines.some(l => l.type === 'chords');
}

/**
 * Attach each `comment` (section label) to the next non-empty content
 * line as a `label` property, and drop empty lines that directly follow
 * a label (they were only there for visual spacing, now unnecessary).
 * Lines that aren't section-starters get `label: null`.
 */
export function attachSectionLabels(parsedLines) {
  const result = [];
  let pending = null;

  for (const line of parsedLines) {
    if (line.type === 'comment') {
      pending = line.text;
      continue;
    }
    if (line.type === 'empty' && pending) {
      continue; // swallow spacer empties while holding a label
    }
    result.push({ ...line, label: pending });
    pending = null;
  }

  return result;
}
