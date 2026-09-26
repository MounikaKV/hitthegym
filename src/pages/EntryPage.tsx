import JevLens from "../components/JevLens";
import { useState } from "react";
import {
  addTodayExerciseEntry,
  addTodayFoodEntry,
  addTodayWeightEntry,
  deleteTodayLogEntry,
  loadTodayEntry,
  updateTodayLogEntry,
} from "../services/entryStorage";
import type { EntryStep, LogCollection, LogEntry } from "../types/entry";
import { getTimeOfDaySentence } from "../utils/timeOfDay";

const steps: { id: EntryStep; label: string }[] = [
  { id: "weight", label: "Weight" },
  { id: "exercise", label: "Exercise" },
  { id: "food", label: "Food" },
];

function EntryPage() {
  const [activeStep, setActiveStep] = useState<EntryStep>("weight");
  const [entryValues, setEntryValues] = useState(() => loadTodayEntry());
  const [weightInput, setWeightInput] = useState("");
  const [exerciseInput, setExerciseInput] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [editing, setEditing] = useState<{
    collection: LogCollection;
    id: string;
    text: string;
  } | null>(null);

  function addWeightEntry() {
    const next = addTodayWeightEntry(weightInput);
    setEntryValues(next);
    setWeightInput("");
  }

  function addExerciseEntry() {
    const next = addTodayExerciseEntry(exerciseInput);
    setEntryValues(next);
    setExerciseInput("");
  }

  function addFoodEntry() {
    const next = addTodayFoodEntry(foodInput);
    setEntryValues(next);
    setFoodInput("");
  }

  function startEdit(collection: LogCollection, item: LogEntry) {
    setEditing({
      collection,
      id: item.id,
      text: item.text,
    });
  }

  function saveEdit() {
    if (!editing) {
      return;
    }

    const next = updateTodayLogEntry(editing.collection, editing.id, editing.text);
    setEntryValues(next);
    setEditing(null);
  }

  function removeEntry(collection: LogCollection, id: string) {
    const next = deleteTodayLogEntry(collection, id);
    setEntryValues(next);
    if (editing?.id === id && editing.collection === collection) {
      setEditing(null);
    }
  }

  function formatClock(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function isToday(isoString: string): boolean {
    const now = new Date();
    const date = new Date(isoString);

    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  function renderHistory(collection: LogCollection, items: LogEntry[], emptyLabel: string) {
    const panelTitle = "Recent entries";
    const todayItems = items.filter((item) => isToday(item.createdAt));

    if (todayItems.length === 0) {
      return (
        <section className="history-card" aria-live="polite">
          <p className="history-title">{panelTitle}</p>
          <div className="food-log">
            <p>{emptyLabel}</p>
          </div>
        </section>
      );
    }

    return (
      <section className="history-card" aria-live="polite">
        <p className="history-title">{panelTitle}</p>
        <div className="food-log">
          {todayItems.map((entry) => {
            const isEditing =
              editing?.id === entry.id && editing.collection === collection;

            return (
              <div key={entry.id} className="food-item editable-item">
                {isEditing ? (
                  <>
                    <input
                      className="inline-edit-input"
                      type="text"
                      value={editing.text}
                      onChange={(event) =>
                        setEditing((prev) =>
                          prev
                            ? {
                                ...prev,
                                text: event.target.value,
                              }
                            : prev,
                        )
                      }
                    />
                    <div className="item-controls">
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={saveEdit}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="mini-btn ghost"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p>{entry.text}</p>
                      <span>{formatClock(entry.createdAt)}</span>
                    </div>
                    <div className="item-controls">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Edit entry"
                        title="Edit"
                        onClick={() => startEdit(collection, entry)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M4 20h4l10-10-4-4L4 16v4zm14.7-11.3 1.6-1.6a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0L15 5.1l3.7 3.6z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-btn ghost"
                        aria-label="Delete entry"
                        title="Delete"
                        onClick={() => removeEntry(collection, entry.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path
                            d="M7 21c-.6 0-1-.4-1-1V7h12v13c0 .6-.4 1-1 1H7zM9 4h6l1 1h4v2H4V5h4l1-1z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>Entry</h1>
      <p className="time-note">{getTimeOfDaySentence()}</p>

      <div className="step-switcher" role="tablist" aria-label="Entry section">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            role="tab"
            aria-selected={activeStep === step.id}
            className={`step-btn ${activeStep === step.id ? "active" : ""}`}
            onClick={() => setActiveStep(step.id)}
          >
            {step.label}
          </button>
        ))}
      </div>

      <form className="entry-form" onSubmit={(event) => event.preventDefault()}>
        {activeStep === "weight" && (
          <>
            <div className="field-group big-card">
              <p>What is your weight right now?</p>
              <input
                className="big-input"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 182 lb or 82.5 kg"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value)}
              />
              <button
                type="button"
                className="action-btn"
                onClick={addWeightEntry}
              >
                Add weigh-in
              </button>
            </div>
            {renderHistory(
              "weightEntries",
              entryValues.weightEntries,
              "No weigh-ins yet today.",
            )}
          </>
        )}

        {activeStep === "exercise" && (
          <>
            <div className="field-group big-card">
              <p>What did you do for exercise?</p>
              <textarea
                className="big-input"
                rows={5}
                placeholder="Leg day: 5x5 squats, 20 min incline walk"
                value={exerciseInput}
                onChange={(event) => setExerciseInput(event.target.value)}
              />
              <button
                type="button"
                className="action-btn"
                onClick={addExerciseEntry}
              >
                Add exercise entry
              </button>
            </div>
            {renderHistory(
              "exerciseEntries",
              entryValues.exerciseEntries,
              "No exercise entries yet today.",
            )}
          </>
        )}

        {activeStep === "food" && (
          <>
            <div className="field-group big-card">
              <p>Log food as it happens</p>
              <div className="inline-input-row">
                <input
                  className="big-input"
                  type="text"
                  placeholder="e.g. Greek yogurt + berries"
                  value={foodInput}
                  onChange={(event) => setFoodInput(event.target.value)}
                />
                <button
                  type="button"
                  className="action-btn compact"
                  onClick={addFoodEntry}
                >
                  Add
                </button>
              </div>
            </div>
            {renderHistory(
              "foodEntries",
              entryValues.foodEntries,
              "No food logged yet today.",
            )}
          </>
        )}
      </form>
      <JevLens entry={entryValues} timeOfDaySentence={getTimeOfDaySentence()} />
    </section>
  );
}

export default EntryPage;
