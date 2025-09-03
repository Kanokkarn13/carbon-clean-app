import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const theme = {
  primary: '#10B981',
  primaryDark: '#059669',
  bg: '#F6FAF8',
  card: '#FFFFFF',
  text: '#0B1721',
  sub: '#6B7280',
  border: '#E5E7EB',
};

const articles = [
  { id: '1', title: 'Global Warming', date: 'June 31, 2021', image: require('../../assets/global_warming.png') },
  { id: '2', title: 'Plastic Bag', date: 'June 31, 2021', image: require('../../assets/plastic_bag.png') },
];

const ArticlesScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerSide}
            onPress={() => navigation.goBack?.()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Articles</Text>
          <View style={styles.headerSide} />{/* spacer keeps title centered */}
        </View>

        {/* Article List */}
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={item.image} style={styles.image} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>{item.date}</Text>
              </View>
              <TouchableOpacity style={styles.readButton} activeOpacity={0.9}>
                <Ionicons name="book-outline" size={16} color={theme.primaryDark} />
                <Text style={styles.readButtonText}>Read</Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />
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
});
