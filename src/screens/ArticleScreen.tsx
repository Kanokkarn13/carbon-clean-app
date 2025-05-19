import React from 'react';
import { View, Text, TextInput, Image, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const articles = [
  {
    id: '1',
    title: 'Global Warming',
    date: 'June 31, 2021',
    image: require('../../assets/global_warming.png'), // use your actual path
  },
  {
    id: '2',
    title: 'Plastic Bag',
    date: 'June 31, 2021',
    image: require('../../assets/plastic_bag.png'),
  },
];

const ArticlesScreen = () => {
  return (
    <View style={styles.container}>
      {/* Back and Title */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="green" />
        <Text style={styles.title}>Articles</Text>
      </View>


      {/* Article List */}
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={item.image} style={styles.image} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>{item.date}</Text>
            </View>
            <TouchableOpacity style={styles.readButton}>
              <Text style={styles.readButtonText}>Read</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

export default ArticlesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardDate: {
    fontSize: 12,
    color: 'gray',
    marginTop: 2,
  },
  readButton: {
    backgroundColor: '#28a745',
    borderRadius: 20,
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 6,
    margin: 10,
  },
  readButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
