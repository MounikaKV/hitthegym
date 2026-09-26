import { useMemo } from "react";
import { loadAllEntries } from "../services/entryStorage";
import { buildReviewPayload } from "../services/reviewData";
import type { DailyEntry, LogEntry } from "../types/entry";

function formatMaybeNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderLogList(items: LogEntry[]) {
  if (items.length === 0) {
    return <p className="stats-muted">No entries</p>;
  }

  return (
    <ul className="stats-list">
      {items.map((item) => (
        <li key={item.id}>
          <span>{formatTime(item.createdAt)}</span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function StatsPage() {
  const payload = useMemo(() => buildReviewPayload(), []);
  const entriesByDay = useMemo(() => loadAllEntries(), []);

  const recentDays = useMemo(() => {
    return Object.values(entriesByDay)
      .sort((a: DailyEntry, b: DailyEntry) => (a.dateKey < b.dateKey ? 1 : -1))
      .slice(0, 7);
  }, [entriesByDay]);

  return (
    <section className="page">
      <h1>Stats</h1>

      <article className="stats-board" aria-label="Detailed statistics">
        <section className="stats-panel stats-grid-two">
          <div>
            <h2>Profile</h2>
            <dl className="stats-kv">
              <div>
                <dt>User</dt>
                <dd>{payload.user_id}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{payload.date}</dd>
              </div>
              <div>
                <dt>Goal Weight</dt>
                <dd>{payload.profile.goal_weight_lbs} lbs</dd>
              </div>
              <div>
                <dt>Starting Weight</dt>
                <dd>{payload.profile.starting_weight_lbs} lbs</dd>
              </div>
              <div>
                <dt>Daily Step Goal</dt>
                <dd>{payload.profile.daily_step_goal}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2>Engagement</h2>
            <dl className="stats-kv">
              <div>
                <dt>Logging Streak</dt>
                <dd>{payload.engagement.current_logging_streak_days} days</dd>
              </div>
              <div>
                <dt>Days Since Weigh-in</dt>
                <dd>
                  {formatMaybeNumber(
                    payload.engagement.days_since_last_weigh_in,
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="stats-panel">
          <h2>Weight Snapshot</h2>
          <dl className="stats-kv stats-kv-inline">
            <div>
              <dt>Today</dt>
              <dd>{formatMaybeNumber(payload.weight.today_lbs)} lbs</dd>
            </div>
            <div>
              <dt>Yesterday</dt>
              <dd>{formatMaybeNumber(payload.weight.yesterday_lbs)} lbs</dd>
            </div>
            <div>
              <dt>7-day Avg</dt>
              <dd>{formatMaybeNumber(payload.weight.seven_day_avg_lbs)} lbs</dd>
            </div>
          </dl>
          <p className="stats-subhead">Last 7 weight entries</p>
          <ul className="stats-chip-list">
            {payload.weight.last_7_entries_lbs.length === 0 && (
              <li className="stats-muted">No values</li>
            )}
            {payload.weight.last_7_entries_lbs.map((value, index) => (
              <li key={`${value}-${index}`}>{value} lbs</li>
            ))}
          </ul>
        </section>

        <section className="stats-panel stats-grid-two">
          <div>
            <h2>Food Today</h2>
            {payload.food_log_today.length === 0 ? (
              <p className="stats-muted">No food entries</p>
            ) : (
              <ul className="stats-list">
                {payload.food_log_today.map((entry, index) => (
                  <li key={`${entry.time}-${index}`}>
                    <span>{entry.time}</span>
                    <span>{entry.entry}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2>Exercise Today</h2>
            {payload.exercise_log_today.length === 0 ? (
              <p className="stats-muted">No exercise entries</p>
            ) : (
              <ul className="stats-list">
                {payload.exercise_log_today.map((entry, index) => (
                  <li key={`${entry.entry}-${index}`}>
                    <span>
                      {entry.type ?? "unknown"}
                      {entry.duration_min !== null
                        ? `, ${entry.duration_min}m`
                        : ""}
                    </span>
                    <span>{entry.entry}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="stats-panel">
          <h2>Activity Fields</h2>
          <dl className="stats-kv stats-kv-inline">
            <div>
              <dt>Steps So Far</dt>
              <dd>{formatMaybeNumber(payload.activity.steps_so_far_today)}</dd>
            </div>
            <div>
              <dt>Avg Steps (7d)</dt>
              <dd>
                {formatMaybeNumber(payload.activity.avg_steps_last_7_days)}
              </dd>
            </div>
            <div>
              <dt>Sleep Last Night</dt>
              <dd>
                {formatMaybeNumber(payload.activity.sleep_hours_last_night)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="stats-panel">
          <h2>Recent History By Day</h2>
          <div className="stats-day-grid">
            {recentDays.map((day) => (
              <article key={day.dateKey} className="stats-day-card">
                <h3>{day.dateKey}</h3>
                <p className="stats-subhead">Weight</p>
                {renderLogList(day.weightEntries)}
                <p className="stats-subhead">Exercise</p>
                {renderLogList(day.exerciseEntries)}
                <p className="stats-subhead">Food</p>
                {renderLogList(day.foodEntries)}
              </article>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}

export default StatsPage;
