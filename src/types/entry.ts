export type EntryStep = "weight" | "exercise" | "food";

export interface LogEntry {
  id: string;
  text: string;
  createdAt: string;
}

export type FoodEntry = LogEntry;
export type WeightEntry = LogEntry;
export type ExerciseEntry = LogEntry;

export type LogCollection = "weightEntries" | "exerciseEntries" | "foodEntries";

export interface DailyEntry {
  dateKey: string;
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
  foodEntries: FoodEntry[];
  updatedAt: string;
}
