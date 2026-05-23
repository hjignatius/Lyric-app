import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { attachSectionLabels } from './chordPro';

// Left page padding is reduced so the label column sits inside the margin.
// Label col (40pt) + left padding (8pt) = 48pt — same content x-position as before.
const LABEL_COL = 40;
const PAGE_PAD_LEFT = 8;

function buildStyles(scale) {
  const s = scale;
  return StyleSheet.create({
    page: {
      paddingTop: 48,
      paddingRight: 48,
      paddingBottom: 48,
      paddingLeft: PAGE_PAD_LEFT,
      fontFamily: 'Helvetica',
      backgroundColor: '#ffffff',
    },
    header: {
      marginLeft: LABEL_COL * s,
      marginBottom: 24 * s,
      borderBottomWidth: 1,
      borderBottomColor: '#cccccc',
      paddingBottom: 12 * s,
    },
    title: {
      fontSize: 22 * s,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a2e',
      marginBottom: 4 * s,
    },
    artist: {
      fontSize: 10 * s,
      color: '#555555',
      marginBottom: 2 * s,
    },
    metaRow: {
      flexDirection: 'row',
      marginTop: 3 * s,
    },
    meta: {
      fontSize: 8 * s,
      color: '#888888',
      marginRight: 12 * s,
    },
    // Each body line is a row: [label col | content col]
    bodyRow: {
      flexDirection: 'row',
    },
    labelCol: {
      width: LABEL_COL * s,
      paddingRight: 4 * s,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    labelText: {
      fontSize: 7 * s,
      fontFamily: 'Helvetica-Bold',
      color: '#7c3aed',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    contentCol: {
      flex: 1,
    },
    lineContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 2 * s,
    },
    segment: {
      flexDirection: 'column',
    },
    chordText: {
      fontSize: 10 * s,
      fontFamily: 'Courier-Bold',
      color: '#7c3aed',
      height: 12 * s,
    },
    lyricText: {
      fontSize: 12 * s,
      color: '#1a1a2e',
      fontFamily: 'Courier',
    },
    plainLyricLine: {
      fontSize: 12 * s,
      color: '#1a1a2e',
      fontFamily: 'Courier',
      marginBottom: 2 * s,
    },
    emptyLine: {
      marginBottom: 8 * s,
    },
  });
}

function ChordLine({ segments, styles }) {
  return (
    <View style={styles.lineContainer}>
      {segments.map((seg, i) => (
        <View key={i} style={styles.segment}>
          <Text style={styles.chordText}>
            {seg.chord ? seg.chord + ' ' : ' '}
          </Text>
          <Text style={styles.lyricText}>
            {seg.text || ' '}
          </Text>
        </View>
      ))}
    </View>
  );
}

function BodyRow({ label, children, styles }) {
  return (
    <View style={styles.bodyRow}>
      <View style={styles.labelCol}>
        {label ? <Text style={styles.labelText}>{label}</Text> : null}
      </View>
      <View style={styles.contentCol}>
        {children}
      </View>
    </View>
  );
}

export function SongDocument({ metadata, parsedLines, scale = 1 }) {
  const styles = buildStyles(scale);
  const { title, artist, key, tempo } = metadata;
  const lines = attachSectionLabels(parsedLines);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header sits to the right of where the label column would be */}
        {(title || artist || key || tempo) ? (
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {artist ? <Text style={styles.artist}>{artist}</Text> : null}
            {(key || tempo) ? (
              <View style={styles.metaRow}>
                {key ? <Text style={styles.meta}>Key: {key}</Text> : null}
                {tempo ? <Text style={styles.meta}>Tempo: {tempo} BPM</Text> : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Body — each line is a [label | content] row */}
        <View>
          {lines.map((line, i) => {
            if (line.type === 'empty') {
              return (
                <BodyRow key={i} label={null} styles={styles}>
                  <View style={styles.emptyLine} />
                </BodyRow>
              );
            }
            if (line.type === 'directive') return null;
            if (line.type === 'chords') {
              return (
                <BodyRow key={i} label={line.label} styles={styles}>
                  <ChordLine segments={line.segments} styles={styles} />
                </BodyRow>
              );
            }
            // plain lyrics
            return (
              <BodyRow key={i} label={line.label} styles={styles}>
                <Text style={styles.plainLyricLine}>
                  {line.segments?.[0]?.text || ''}
                </Text>
              </BodyRow>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
