export interface WeatherContext {
  temperatureF: number;
  feelsLikeF: number;
  precipitationProbability: number;
  precipitationMm: number;
  windMph: number;
  weatherCode: number;
  condition: string;
  emoji: string;
  isDay: boolean;
  outdoorFriendly: boolean;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}