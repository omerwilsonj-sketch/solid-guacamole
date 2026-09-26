import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { WorkoutSession, WorkoutLog, ExerciseLog, SetLog } from '../types/workout';
import { WORKOUTS } from '../constants/workouts';
import { COLORS, SPACING } from '../constants/theme';

interface Props {
  workoutId: string;
  userId: string;
  onClose: () => void;
}

export default function WorkoutSessionScreen({ workoutId, userId, onClose }: Props) {
  const workout = WORKOUTS.find((w) => w.id === workoutId) || WORKOUTS[0];
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const initialLogs: ExerciseLog[] = [];
    [...workout.workBlock1.exercises, ...workout.workBlock2.exercises].forEach((ex) => {
      initialLogs.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: [{ setNumber: 1, reps: 0, weight: 0 }],
      });
    });
    setLogs(initialLogs);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const updateLog = (exerciseId: string, setIndex: number, field: keyof SetLog, value: string) => {
    const newLogs = [...logs];
    const exerciseLog = newLogs.find((l) => l.exerciseId === exerciseId);
    if (exerciseLog) {
      const numValue = parseInt(value) || 0;
      exerciseLog.sets[setIndex] = {
        ...exerciseLog.sets[setIndex],
        [field]: numValue,
      };
      setLogs(newLogs);
    }
  };

  const addSet = (exerciseId: string) => {
    const newLogs = [...logs];
    const exerciseLog = newLogs.find((l) => l.exerciseId === exerciseId);
    if (exerciseLog) {
      exerciseLog.sets.push({
        setNumber: exerciseLog.sets.length + 1,
        reps: 0,
        weight: 0,
      });
      setLogs(newLogs);
    }
  };

  const finishWorkout = async () => {
    setSaving(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const workoutLog: WorkoutLog = {
      user_id: userId,
      workout_id: workoutId,
      date: new Date().toISOString(),
      duration_seconds: 30 * 60 - timeLeft,
      logs,
    };

    try {
      const { error } = await supabase.from('workout_logs').insert([workoutLog]);
      if (error) throw error;
      
      Alert.alert('VICTORY', 'Session completed and logged.', [
        { text: 'RESUME', onPress: onClose }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.timerLabel}>REMAINING</Text>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.workoutTitle}>{workout.title.toUpperCase()}</Text>

        <Section title="WARM-UP" duration={workout.warmup.duration}>
          <Text style={styles.description}>{workout.warmup.description}</Text>
        </Section>

        <Section title={workout.workBlock1.title.toUpperCase()} duration={workout.workBlock1.duration}>
          <Text style={styles.format}>{workout.workBlock1.format}</Text>
          {workout.workBlock1.exercises.map((ex) => (
            <ExerciseItem 
              key={ex.id} 
              exercise={ex} 
              log={logs.find(l => l.exerciseId === ex.id)}
              onUpdateLog={updateLog}
              onAddSet={addSet}
            />
          ))}
        </Section>

        <Section title={workout.workBlock2.title.toUpperCase()} duration={workout.workBlock2.duration}>
          <Text style={styles.format}>{workout.workBlock2.format}</Text>
          {workout.workBlock2.exercises.map((ex) => (
            <ExerciseItem 
              key={ex.id} 
              exercise={ex} 
              log={logs.find(l => l.exerciseId === ex.id)}
              onUpdateLog={updateLog}
              onAddSet={addSet}
            />
          ))}
        </Section>

        <Section title="COOL-DOWN" duration={workout.cooldown.duration}>
          <Text style={styles.description}>{workout.cooldown.description}</Text>
        </Section>
      </ScrollView>

      <TouchableOpacity 
        style={styles.finishButton} 
        onPress={finishWorkout}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.finishButtonText}>FINISH SESSION</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Section({ title, duration, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDuration}>{duration} MIN</Text>
      </View>
      {children}
    </View>
  );
}

function ExerciseItem({ exercise, log, onUpdateLog, onAddSet }: any) {
  return (
    <View style={styles.exerciseContainer}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <TouchableOpacity onPress={() => Alert.alert('Video Demo', `Link: ${exercise.videoUrl}`)}>
          <Text style={styles.videoLink}>VIDEO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logHeader}>
        <Text style={[styles.logHeaderText, { flex: 1 }]}>SET</Text>
        <Text style={[styles.logHeaderText, { flex: 2 }]}>KG</Text>
        <Text style={[styles.logHeaderText, { flex: 2 }]}>REPS</Text>
      </View>

      {log?.sets.map((set: SetLog, index: number) => (
        <View key={index} style={styles.logRow}>
          <Text style={[styles.setNumber, { flex: 1 }]}>{set.setNumber}</Text>
          <TextInput
            style={[styles.logInput, { flex: 2 }]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#444"
            value={set.weight ? set.weight.toString() : ''}
            onChangeText={(val) => onUpdateLog(exercise.id, index, 'weight', val)}
          />
          <TextInput
            style={[styles.logInput, { flex: 2 }]}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#444"
            value={set.reps ? set.reps.toString() : ''}
            onChangeText={(val) => onUpdateLog(exercise.id, index, 'reps', val)}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.addSetButton} onPress={() => onAddSet(exercise.id)}>
        <Text style={styles.addSetText}>+ ADD SET</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 2 },
  timer: { fontSize: 32, fontWeight: '900', color: COLORS.primary },
  closeButton: { padding: 8, backgroundColor: COLORS.error + '22', borderRadius: 8, borderWidth: 1, borderColor: COLORS.error },
  closeButtonText: { color: COLORS.error, fontSize: 10, fontWeight: '800' },
  scrollView: { flex: 1, padding: SPACING.lg },
  workoutTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 20, letterSpacing: 1 },
  section: { marginBottom: 30 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1 },
  sectionDuration: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  format: { fontSize: 12, fontStyle: 'italic', color: COLORS.primary, marginBottom: 15, fontWeight: '600' },
  exerciseContainer: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  exerciseName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  videoLink: { color: COLORS.primary, fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: COLORS.primary },
  logHeader: { flexDirection: 'row', marginBottom: 10 },
  logHeaderText: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '800' },
  logRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  setNumber: { textAlign: 'center', fontWeight: '800', color: COLORS.textSecondary, fontSize: 12 },
  logInput: { height: 45, backgroundColor: COLORS.background, borderRadius: 8, marginHorizontal: 5, color: COLORS.text, textAlign: 'center', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border },
  addSetButton: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  addSetText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '800' },
  finishButton: { margin: SPACING.lg, backgroundColor: COLORS.success, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  finishButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
});
