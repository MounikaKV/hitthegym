import { useEffect, useState } from "react";
import { getUserLocation } from "../lib/location";
import { getWeather } from "../lib/weather";
import type { WeatherContext } from "../types/weather";
import "./WeatherCard.css";

interface WeatherCardProps {
  onWeatherLoaded: (weather: WeatherContext | null) => void;
}

export default function WeatherCard({ onWeatherLoaded }: WeatherCardProps) {
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let active = true;
    getUserLocation()
      .then(getWeather)
      .then((result) => {
        if (!active) return;
        setWeather(result);
        onWeatherLoaded(result);
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setWeather(null);
        onWeatherLoaded(null);
        setState("unavailable");
      });
    return () => { active = false; };
  }, [onWeatherLoaded]);

  return (
    <aside className="weather-card" aria-label="Weather context" aria-live="polite">
      <div className="weather-card-heading">Weather context</div>
      {state === "loading" && <p>Checking local conditions...</p>}
      {state === "unavailable" && <p>Weather unavailable. Jev will continue without it.</p>}
      {state === "ready" && weather && (
        <>
          <div className="weather-card-current">
            <span className="weather-card-emoji" aria-hidden="true">{weather.emoji}</span>
            <div>
              <strong>{Math.round(weather.temperatureF)}°F</strong>
              <span className="weather-card-condition">{weather.condition}</span>
            </div>
          </div>
          <div className="weather-card-details">
            <span>Feels like {Math.round(weather.feelsLikeF)}°F</span>
            <span>{Math.round(weather.precipitationProbability)}% rain</span>
            <span>Wind {Math.round(weather.windMph)} mph</span>
          </div>
          <p>{weather.outdoorFriendly
            ? "Good conditions for being outside"
            : "Outdoor conditions may not be favorable"}</p>
        </>
      )}
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
        Weather data by Open-Meteo
      </a>
    </aside>
  );
}