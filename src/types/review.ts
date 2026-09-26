export interface UserProfile {
  goal_weight_lbs: number;
  starting_weight_lbs: number;
  daily_step_goal: number;
}

export interface ReviewFoodLog {
  time: string;
  entry: string;
}

export interface ReviewExerciseLog {
  type: string | null;
  duration_min: number | null;
  entry: string;
}

export interface ReviewPayload {
  user_id: string;
  date: string;
  profile: UserProfile;
  weight: {
    today_lbs: number | null;
    yesterday_lbs: number | null;
    seven_day_avg_lbs: number | null;
    last_7_entries_lbs: number[];
  };
  food_log_today: ReviewFoodLog[];
  exercise_log_today: ReviewExerciseLog[];
  activity: {
    steps_so_far_today: number | null;
    avg_steps_last_7_days: number | null;
    sleep_hours_last_night: number | null;
  };
  engagement: {
    current_logging_streak_days: number;
    days_since_last_weigh_in: number | null;
  };
}
