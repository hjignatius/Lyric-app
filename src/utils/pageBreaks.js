// Estimate where the PDF will break pages, so the preview can show
// a visual divider at the matching point in the source.
//
// The numbers below mirror the styles in SongDocument.jsx. They're
// approximations — @react-pdf's actual paginator may shift a line by
// a few points — but they're close enough to tell you what fits on a page.

const A4_HEIGHT_PT = 841.89;
const PAGE_PADDING_PT = 48; // top + bottom each
const CONTENT_HEIGHT_PT = A4_HEIGHT_PT - PAGE_PADDING_PT * 2; // ~745.89

// Per-line height estimates (in points), matching SongDocument styles.
// Line-height multiplier of 1.2 is the @react-pdf default for Text.
const LINE_HEIGHT_MULT = 1.2;

const HEIGHTS = {
  // chord row (10pt, fixed height 12) + lyric row (12pt × 1.2) + margin 2
  chords: 12 + 12 * LINE_HEIGHT_MULT + 2,
  // plain lyric line: 12pt × 1.2 + margin 2
  lyrics: 12 * LINE_HEIGHT_MULT + 2,
  // empty line spacer
  empty: 8,
  // section label: marginTop 12 + 11pt × 1.2 + marginBottom 4
  comment: 12 + 11 * LINE_HEIGHT_MULT + 4,
  // directives don't render in the body
  directive: 0,
};

function headerHeight(metadata) {
  if (!metadata?.title && !metadata?.artist && !metadata?.key && !metadata?.tempo) {
    return 0;
  }
  let h = 0;
  if (metadata.title)  h += 22 * LINE_HEIGHT_MULT + 4;   // title + marginBottom
  if (metadata.artist) h += 13 * LINE_HEIGHT_MULT + 2;   // artist + marginBottom
  if (metadata.key || metadata.tempo) h += 4 + 11 * LINE_HEIGHT_MULT; // metaRow marginTop + meta line
  h += 12;  // paddingBottom
  h += 1;   // border
  h += 24;  // marginBottom
  return h;
}

/**
 * Returns an array of zero-based line indices where a page break
 * occurs immediately before that line. e.g. [42, 78] means line 42
 * is the first line of page 2 and line 78 is the first line of page 3.
 */
export function computePageBreaks(parsedLines, metadata) {
  const breaks = [];
  let cursor = headerHeight(metadata);

  for (let i = 0; i < parsedLines.length; i++) {
    const h = HEIGHTS[parsedLines[i].type] ?? HEIGHTS.lyrics;
    if (cursor + h > CONTENT_HEIGHT_PT) {
      breaks.push(i);
      cursor = h;
    } else {
      cursor += h;
    }
  }

  return breaks;
}
