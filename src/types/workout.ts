export interface Exercise {
  id: string;
  name: string;
  category: string;
  tier: string;
  equipment: string;
  target?: string;
  setup?: string;
  execution?: string;
  breathing?: string;
  commonMistakes?: string[];
  progression?: string;
  regression?: string;
  targetSets?: number;
  targetReps?: number;
  videoUrl?: string;
  notes?: string;
}

export interface ExerciseRef {
  id: string;
  name: string;
  targetSets?: number;
  targetReps?: number;
  videoUrl?: string;
}

export interface WorkBlock {
  title: string;
  duration: number; // in minutes
  format: string;
  exercises: ExerciseRef[];
}

export interface WorkoutSession {
  id: string;
  title: string;
  phase: number;
  week: number;
  day: string;
  warmup: {
    duration: number;
    description: string;
  };
  workBlock1: WorkBlock;
  workBlock2: WorkBlock;
  cooldown: {
    duration: number;
    description: string;
  };
}

export interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
}

export interface WorkoutLog {
  id?: string;
  user_id: string;
  workout_id: string;
  date: string;
  duration_seconds: number;
  logs: ExerciseLog[];
  notes?: string;
}
