import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const theme = {
  primary: '#07F890',
  primaryDark: '#05C76E',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

const RAW_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, '');
const api = (path: string) => `${API_ORIGIN}/api${path}`;

type Article = {
  id: number;
  title: string;
  content: string;
  cover_image_url?: string | null;
  author_id?: number | null;
  create_at?: string | null;
  update_at?: string | null;
};

function stripHtml(html: string) {
  return (html || '').replace(/<[^>]*>/g, '').trim();
}

type InlineSpan = { value: string; bold?: boolean; italic?: boolean };

function parseInline(html: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  if (!html) return spans;

  const normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '');
  const tagRe = /<(\/?)(strong|b|em|i)>/gi;
  let bold = false;
  let italic = false;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text) return;
    const clean = text.replace(/<[^>]*>/g, '');
    if (clean) spans.push({ value: clean, bold, italic });
  };

  while ((match = tagRe.exec(normalized)) !== null) {
    const textPart = normalized.slice(lastIndex, match.index);
    pushText(textPart);
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (tag === 'strong' || tag === 'b') bold = !closing;
    if (tag === 'em' || tag === 'i') italic = !closing;
    lastIndex = tagRe.lastIndex;
  }

  pushText(normalized.slice(lastIndex));
  return spans;
}

type ContentBlock = { type: 'text'; spans: InlineSpan[] } | { type: 'image'; src: string };

function parseContent(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (!html) return blocks;
  const imgRe = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imgRe.exec(html)) !== null) {
    const textPart = html.slice(lastIndex, match.index);
    const spans = parseInline(textPart);
    if (spans.length) blocks.push({ type: 'text', spans });

    const src = match[1];
    if (src) blocks.push({ type: 'image', src });

    lastIndex = imgRe.lastIndex;
  }

  const tail = html.slice(lastIndex);
  const tailSpans = parseInline(tail);
  if (tailSpans.length) blocks.push({ type: 'text', spans: tailSpans });

  return blocks.length ? blocks : [{ type: 'text', spans: parseInline(html) }];
}

const ArticlesScreen = () => {
  const navigation = useNavigation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Article | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(api('/articles'));
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        const json = text ? JSON.parse(text) : {};
        const items = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
        if (active) setArticles(items as Article[]);
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load articles');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const renderItem = ({ item }: { item: Article }) => {
    const preview = stripHtml(item.content || '').slice(0, 140);
    const date = item.create_at ? new Date(item.create_at).toLocaleDateString('en-GB') : '';
    return (
      <TouchableOpacity onPress={() => setSelected(item)} activeOpacity={0.9} style={styles.card}>
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="image-outline" size={32} color={theme.sub} />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
          <Text style={styles.cardDate}>{date}</Text>
        </View>
        <View style={styles.readButton}>
          <Ionicons name="book-outline" size={16} color={theme.primaryDark} />
          <Text style={styles.readButtonText}>Read</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const detailBlocks = useMemo(() => parseContent(selected?.content || ''), [selected?.content]);
  const detailDate = selected?.create_at ? new Date(selected.create_at).toLocaleDateString('en-GB') : '';

  const showBack = !!selected;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => (showBack ? setSelected(null) : navigation.goBack?.())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{showBack ? 'Article' : 'Articles'}</Text>
          <View style={styles.headerSide} />
        </View>

        {/* Article List */}
        {selected ? (
          <ScrollView contentContainerStyle={[styles.detailWrap, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.cardTitle, { fontSize: 20, marginTop: 10 }]}>{selected.title || 'Untitled'}</Text>
            {selected.cover_image_url ? (
              <Image source={{ uri: selected.cover_image_url }} style={[styles.image, { borderRadius: 12, marginTop: 8 }]} />
            ) : null}
            <Text style={[styles.cardDate, { marginTop: 4 }]}>{detailDate}</Text>
            <View style={{ marginTop: 12, gap: 12 }}>
              {detailBlocks.map((b, idx) =>
                b.type === 'image' ? (
                  <Image key={`img-${idx}`} source={{ uri: b.src }} style={[styles.image, { borderRadius: 12 }]} />
                ) : (
                  <Text key={`txt-${idx}`} style={[styles.cardPreview, { lineHeight: 20 }]}>
                    {b.spans.map((s, i) => (
                      <Text
                        key={`span-${idx}-${i}`}
                        style={[
                          s.bold && styles.bold,
                          s.italic && styles.italic,
                        ]}
                      >
                        {s.value}
                      </Text>
                    ))}
                  </Text>
                )
              )}
            </View>
          </ScrollView>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.cardDate}>Loading…</Text>
          </View>
        ) : error ? (
          <Text style={[styles.cardDate, { color: '#B91C1C' }]}>{error}</Text>
        ) : (
          <FlatList
            data={articles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ArticlesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  headerSide: { width: 28, alignItems: 'flex-start' },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.primaryDark,
  },

  /* Card */
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
  },
  cardDate: {
    fontSize: 12,
    color: theme.sub,
    marginTop: 4,
  },
  cardPreview: { fontSize: 13, color: theme.text, marginTop: 6 },

  /* Read button */
  readButton: {
    alignSelf: 'flex-end',
    marginRight: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readButtonText: {
    color: theme.primaryDark,
    fontWeight: '800',
  },
  center: { alignItems: 'center', marginTop: 20 },
  detailWrap: { paddingHorizontal: 4 },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
});
