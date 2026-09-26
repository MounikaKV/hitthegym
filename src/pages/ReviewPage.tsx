import { useMemo } from "react";
import JevLens from "../components/JevLens";
import { VerdictButton } from "../components/VerdictButton";
import { loadTodayEntry } from "../services/entryStorage";
import { buildReviewPayload } from "../services/reviewData";
import { getTimeOfDaySentence } from "../utils/timeOfDay";

function ReviewPage() {
  const payload = useMemo(() => buildReviewPayload(), []);
  const todayEntry = useMemo(() => loadTodayEntry(), []);
  const timeOfDaySentence = useMemo(() => getTimeOfDaySentence(), []);

  return (
    <section className="page">
      <h1>Review</h1>
      <p>This is the data package for analysis.</p>
      <VerdictButton day={payload} />

      <section className="card card--soft">
        <p className="eyebrow">Summary</p>
        <div className="chip-row">
          <span className="chip">Date: {payload.date}</span>
          <span className="chip">User: {payload.user_id}</span>
          <span className="tone-badge tone-neutral">Data package</span>
        </div>
        <p>
          Today: {payload.weight.today_lbs ?? "-"} lbs | 7-day avg:{" "}
          {payload.weight.seven_day_avg_lbs ?? "-"} lbs
        </p>
        <p>
          Food entries today: {payload.food_log_today.length} | Exercise entries
          today: {payload.exercise_log_today.length}
        </p>
        <p>
          Logging streak: {payload.engagement.current_logging_streak_days} days
        </p>
      </section>

      <JevLens entry={todayEntry} timeOfDaySentence={timeOfDaySentence} />
    </section>
  );
}

export default ReviewPage;
