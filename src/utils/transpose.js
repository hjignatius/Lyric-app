const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const ENHARMONIC = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

function noteIndex(note) {
  const i = SHARPS.indexOf(note);
  if (i !== -1) return i;
  const j = FLATS.indexOf(note);
  return j;
}

function transposeNote(note, semitones, useFlats = false) {
  const scale = useFlats ? FLATS : SHARPS;
  const idx = noteIndex(note);
  if (idx === -1) return note;
  return scale[((idx + semitones) % 12 + 12) % 12];
}

/**
 * Transpose a full chord symbol by `semitones`.
 * Handles: G, Gm, G7, Gmaj7, G/B, Gsus4, etc.
 */
export function transposeChord(chord, semitones, useFlats = false) {
  if (!chord || semitones === 0) return chord;

  // Match root note (1-2 chars) + optional modifier + optional bass note
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  let [, root, suffix] = match;
  const newRoot = transposeNote(root, semitones, useFlats);

  // Handle slash chords: G/B → transpose the bass too
  const slashMatch = suffix.match(/^(.*)\/([A-G][#b]?)(.*)$/);
  if (slashMatch) {
    const newBass = transposeNote(slashMatch[2], semitones, useFlats);
    return newRoot + slashMatch[1] + '/' + newBass + slashMatch[3];
  }

  return newRoot + suffix;
}

/**
 * Transpose all chords in a ChordPro text string.
 */
export function transposeText(text, semitones, useFlats = false) {
  if (semitones === 0) return text;
  return text.replace(/\[([^\]]+)\]/g, (_, chord) => {
    return '[' + transposeChord(chord, semitones, useFlats) + ']';
  });
}

export const NOTE_NAMES = SHARPS;
