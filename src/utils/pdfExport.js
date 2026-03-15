import { pdf } from '@react-pdf/renderer';
import { parseChordPro } from './chordPro';
import { SongDocument } from './SongDocument';

export async function exportToPdf(metadata, chordProText) {
  const parsedLines = parseChordPro(chordProText);
  const blob = await pdf(SongDocument({ metadata, parsedLines })).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = (metadata.title || 'song').replace(/\s+/g, '_') + '.pdf';
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
