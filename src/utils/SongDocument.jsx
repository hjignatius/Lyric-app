import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  artist: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
    color: '#888888',
    marginRight: 16,
  },
  lineContainer: {
    marginBottom: 2,
  },
  chordsRow: {
    flexDirection: 'row',
  },
  lyricsRow: {
    flexDirection: 'row',
  },
  chordText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
  },
  lyricText: {
    fontSize: 12,
    color: '#1a1a2e',
    fontFamily: 'Courier',
  },
  plainLyricLine: {
    fontSize: 12,
    color: '#1a1a2e',
    fontFamily: 'Courier',
    marginBottom: 2,
  },
  emptyLine: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#7c3aed',
    marginBottom: 4,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

function measureChordWidth(chord) {
  return Math.max((chord?.length || 0) * 6.5 + 4, 20);
}

function measureLyricWidth(text) {
  return Math.max((text?.length || 0) * 7, 1);
}

function ChordLine({ segments }) {
  const items = segments.map(seg => ({
    ...seg,
    w: Math.max(measureChordWidth(seg.chord), measureLyricWidth(seg.text)),
  }));

  return (
    <View style={styles.lineContainer}>
      <View style={styles.chordsRow}>
        {items.map((seg, i) => (
          <Text key={i} style={[styles.chordText, { minWidth: seg.w }]}>
            {seg.chord || ' '}
          </Text>
        ))}
      </View>
      <View style={styles.lyricsRow}>
        {items.map((seg, i) => (
          <Text key={i} style={[styles.lyricText, { minWidth: seg.w }]}>
            {seg.text || ' '}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function SongDocument({ metadata, parsedLines }) {
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
            if (line.type === 'chords') return <ChordLine key={i} segments={line.segments} />;
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
