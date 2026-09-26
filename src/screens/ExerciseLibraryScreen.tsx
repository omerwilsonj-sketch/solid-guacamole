import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
} from 'react-native';
import { EXERCISES } from '../constants/exercises';
import { Exercise } from '../types/workout';
import { COLORS, SPACING } from '../constants/theme';

export default function ExerciseLibraryScreen() {
  const [search, setSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const filteredExercises = EXERCISES.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase())
  );

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => setSelectedExercise(item)}
    >
      <View>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseCategory}>{item.category} • {item.tier}</Text>
      </View>
      <Text style={styles.chevron}>{'>'}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercise Library</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises or categories..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={!!selectedExercise}
        animationType="slide"
        transparent={false}
      >
        {selectedExercise && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedExercise.name}</Text>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.badgeText}>{selectedExercise.tier}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{selectedExercise.category}</Text>
                </View>
              </View>

              <Section title="Target" content={selectedExercise.target} />
              <Section title="Equipment" content={selectedExercise.equipment} />
              <Section title="Setup" content={selectedExercise.setup} />
              <Section title="Execution" content={selectedExercise.execution} />
              <Section title="Breathing" content={selectedExercise.breathing} />
              
              {selectedExercise.commonMistakes && selectedExercise.commonMistakes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Common Mistakes</Text>
                  {selectedExercise.commonMistakes.map((mistake, index) => (
                    <Text key={index} style={styles.bulletPoint}>• {mistake}</Text>
                  ))}
                </View>
              )}

              <Section title="Progression" content={selectedExercise.progression} />
              <Section title="Regression" content={selectedExercise.regression} />
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, content }: { title: string; content?: string }) {
  if (!content) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionContent}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    backgroundColor: '#222',
    color: COLORS.text,
    padding: SPACING.sm,
    borderRadius: 8,
    fontSize: 16,
  },
  listContent: {
    padding: SPACING.md,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  chevron: {
    color: '#666',
    fontSize: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    padding: SPACING.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  badge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  bulletPoint: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 4,
    paddingLeft: 8,
  },
});
