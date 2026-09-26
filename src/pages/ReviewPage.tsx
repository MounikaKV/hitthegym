import { useMemo } from "react";
import { VerdictButton } from "../components/VerdictButton";
import { buildReviewPayload } from "../services/reviewData";

function ReviewPage() {
  const payload = useMemo(() => buildReviewPayload(), []);

  return (
    <section className="page">
      <h1>Review</h1>
      <p>This is the data package for analysis.</p>
      <VerdictButton day={payload} />

      <section className="history-card">
        <p className="history-title">Summary</p>
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

      <section className="history-card">
        <p className="history-title">Payload</p>
        <pre className="json-block">{JSON.stringify(payload, null, 2)}</pre>
      </section>
    </section>
  );
}

export default ReviewPage;
