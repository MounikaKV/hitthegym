export type TimeOfDay = "morning" | "afternoon" | "evening";

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();

  if (hour < 12) {
    return "morning";
  }

  if (hour < 18) {
    return "afternoon";
  }

  return "evening";
}

export function getTimeOfDaySentence(date = new Date()): string {
  return `It's ${getTimeOfDay(date)}.`;
}
