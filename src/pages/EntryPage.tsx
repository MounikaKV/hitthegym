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

  function renderHistory(collection: LogCollection, items: LogEntry[], emptyLabel: string) {
    if (items.length === 0) {
      return (
        <div className="food-log" aria-live="polite">
          <p>{emptyLabel}</p>
        </div>
      );
    }

    return (
      <div className="food-log" aria-live="polite">
        {items.map((entry) => {
          const isEditing = editing?.id === entry.id && editing.collection === collection;

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
                    <button type="button" className="mini-btn" onClick={saveEdit}>
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
                      className="mini-btn"
                      onClick={() => startEdit(collection, entry)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="mini-btn ghost"
                      onClick={() => removeEntry(collection, entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
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
            <button type="button" className="action-btn" onClick={addWeightEntry}>
              Add weigh-in
            </button>
            {renderHistory("weightEntries", entryValues.weightEntries, "No weigh-ins yet today.")}
          </div>
        )}

        {activeStep === "exercise" && (
          <div className="field-group big-card">
            <p>What did you do for exercise?</p>
            <textarea
              className="big-input"
              rows={5}
              placeholder="Leg day: 5x5 squats, 20 min incline walk"
              value={exerciseInput}
              onChange={(event) => setExerciseInput(event.target.value)}
            />
            <button type="button" className="action-btn" onClick={addExerciseEntry}>
              Add exercise entry
            </button>
            {renderHistory(
              "exerciseEntries",
              entryValues.exerciseEntries,
              "No exercise entries yet today.",
            )}
          </div>
        )}

        {activeStep === "food" && (
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

            {renderHistory("foodEntries", entryValues.foodEntries, "No food logged yet today.")}
          </div>
        )}
      </form>
      <JevLens />
    </section>
  );
}

export default EntryPage;
