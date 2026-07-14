import type { WeatherKind, WeatherState } from "./types";

const weatherCatalog: Record<
  WeatherKind,
  {
    label: string;
    description: string;
    isExtreme: boolean;
  }
> = {
  clear: {
    label: "晴朗",
    description: "适合按原路线步行游览。",
    isExtreme: false,
  },
  rain: {
    label: "雨天",
    description: "建议减少露天停留，优先选择室内或有檐空间。",
    isExtreme: true,
  },
  hot: {
    label: "高温",
    description: "建议补水、防晒，避免在开阔区域长时间停留。",
    isExtreme: true,
  },
  snow: {
    label: "降雪",
    description: "建议注意地面湿滑，优先选择室内点位和短距离移动。",
    isExtreme: true,
  },
};

const weatherKinds = Object.keys(weatherCatalog) as WeatherKind[];
let currentMockKind: WeatherKind = "clear";

const weatherTransitions: Record<WeatherKind, WeatherKind[]> = {
  clear: ["clear", "clear", "clear", "rain", "hot"],
  rain: ["rain", "rain", "rain", "clear"],
  hot: ["hot", "hot", "hot", "clear"],
  snow: ["snow", "snow", "snow", "clear"],
};

export function normalizeWeatherKind(value?: string | null): WeatherKind | undefined {
  if (!value) return undefined;
  return weatherKinds.find((kind) => kind === value);
}

export function createWeatherState(kind: WeatherKind, source: WeatherState["source"]): WeatherState {
  const weather = weatherCatalog[kind];
  return {
    kind,
    label: weather.label,
    description: weather.description,
    isExtreme: weather.isExtreme,
    updatedAt: new Date().toISOString(),
    source,
  };
}

export function getMockWeatherState(options: { override?: WeatherKind; spotId?: string } = {}) {
  if (options.override) {
    currentMockKind = options.override;
    return createWeatherState(options.override, "override");
  }

  const shouldChange = Math.random() < 0.22;
  if (shouldChange) {
    const candidates = weatherTransitions[currentMockKind];
    currentMockKind = candidates[Math.floor(Math.random() * candidates.length)];
  }

  return createWeatherState(currentMockKind, "mock");
}
