import type { LocationCoordinates, WeatherContext } from "../types/weather";

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    precipitation_probability: number[];
  };
}

function describeWeather(code: number): Pick<WeatherContext, "condition" | "emoji"> {
  switch (code) {
    case 0: return { condition: "clear", emoji: "☀️" };
    case 1: return { condition: "mostly clear", emoji: "🌤️" };
    case 2: return { condition: "partly cloudy", emoji: "⛅" };
    case 3: return { condition: "overcast", emoji: "☁️" };
    case 45: case 48: return { condition: "foggy", emoji: "🌫️" };
    case 51: case 53: case 55: case 56: case 57:
      return { condition: "drizzly", emoji: "🌦️" };
    case 61: case 63: case 65: case 66: case 67:
    case 80: case 81: case 82:
      return { condition: "rainy", emoji: "🌧️" };
    case 71: case 73: case 75: case 77: case 85: case 86:
      return { condition: "snowy", emoji: "❄️" };
    case 95: case 96: case 99: return { condition: "stormy", emoji: "⛈️" };
    default: return { condition: "unknown", emoji: "🌡️" };
  }
}

function validWeather(data: unknown): data is OpenMeteoResponse {
  if (!data || typeof data !== "object") return false;
  const { current, hourly } = data as Partial<OpenMeteoResponse>;
  return !!current && !!hourly && typeof current.time === "string" &&
    [current.temperature_2m, current.apparent_temperature, current.precipitation,
      current.weather_code, current.wind_speed_10m, current.is_day].every(
      (value) => typeof value === "number" && Number.isFinite(value),
    ) &&
    Array.isArray(hourly.time) && Array.isArray(hourly.precipitation_probability) &&
    hourly.time.every((time) => typeof time === "string") &&
    hourly.precipitation_probability.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    );
}

export async function getWeather(location: LocationCoordinates): Promise<WeatherContext> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day",
    hourly: "precipitation_probability",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "mm",
    forecast_days: "1",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Weather unavailable.");

  const data: unknown = await response.json();
  if (!validWeather(data)) throw new Error("Invalid weather data.");
  const hour = data.current.time.slice(0, 13);
  const index = data.hourly.time.findIndex((time) => time.slice(0, 13) === hour);
  const precipitationProbability = data.hourly.precipitation_probability[index];
  if (index < 0 || precipitationProbability === undefined ||
    precipitationProbability < 0 || precipitationProbability > 100) {
    throw new Error("Current precipitation forecast unavailable.");
  }

  const { current } = data;
  const description = describeWeather(current.weather_code);
  const outdoorFriendly = current.is_day === 1 && precipitationProbability < 30 &&
    current.precipitation === 0 &&
    !["rainy", "snowy", "stormy", "drizzly", "unknown"].includes(description.condition) &&
    current.wind_speed_10m < 25 && current.temperature_2m >= 40 &&
    current.temperature_2m <= 95;

  return {
    temperatureF: current.temperature_2m,
    feelsLikeF: current.apparent_temperature,
    precipitationProbability,
    precipitationMm: current.precipitation,
    windMph: current.wind_speed_10m,
    weatherCode: current.weather_code,
    ...description,
    isDay: current.is_day === 1,
    outdoorFriendly,
  };
}