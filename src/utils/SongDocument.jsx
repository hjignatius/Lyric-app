import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Build the stylesheet with all dimensional values multiplied by `scale`.
// Page padding is left unscaled — we want the same A4 margin regardless,
// so shrinking content alone is what creates more room.
function buildStyles(scale) {
  const s = scale;
  return StyleSheet.create({
    page: {
      padding: 48,
      fontFamily: 'Helvetica',
      backgroundColor: '#ffffff',
    },
    header: {
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
      fontSize: 13 * s,
      color: '#555555',
      marginBottom: 2 * s,
    },
    metaRow: {
      flexDirection: 'row',
      marginTop: 4 * s,
    },
    meta: {
      fontSize: 11 * s,
      color: '#888888',
      marginRight: 16 * s,
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
    sectionLabel: {
      fontSize: 11 * s,
      fontFamily: 'Helvetica-Bold',
      color: '#7c3aed',
      marginBottom: 4 * s,
      marginTop: 12 * s,
      textTransform: 'uppercase',
      letterSpacing: 1,
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

export function SongDocument({ metadata, parsedLines, scale = 1 }) {
  const styles = buildStyles(scale);
  const { title, artist, key, tempo } = metadata;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

        <View>
          {parsedLines.map((line, i) => {
            if (line.type === 'empty') return <View key={i} style={styles.emptyLine} />;
            if (line.type === 'comment') return <Text key={i} style={styles.sectionLabel}>{line.text}</Text>;
            if (line.type === 'directive') return null;
            if (line.type === 'chords') return <ChordLine key={i} segments={line.segments} styles={styles} />;
            return (
              <Text key={i} style={styles.plainLyricLine}>
                {line.segments?.[0]?.text || ''}
              </Text>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
