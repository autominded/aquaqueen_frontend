import { DeviceChannel, DeviceOutput, DeviceReading } from "../api/types";

/**
 * Presentation metadata for each sensor channel, in one place.
 *
 * Six screens render these values and every one of them needs the same
 * label, unit, precision and reading-key mapping. Duplicating that is how a
 * dissolved-oxygen figure ends up shown to three decimals on one screen and
 * one on another.
 */
export interface ChannelMeta {
  key: DeviceChannel;
  label: string;
  short: string;
  unit: string;
  // Decimals. Chosen per channel from what the probe can actually resolve —
  // showing pH to three places implies a precision no farm probe has.
  decimals: number;
  // Which DeviceReading field carries it.
  field: keyof DeviceReading;
  icon: "thermometer" | "wind" | "droplet" | "alert-triangle" | "eye" | "zap" | "activity" | "bar-chart-2";
  // What the farmer is buying when they add this probe. Shown in the
  // channels screen next to a disabled channel, because "ec" means nothing
  // to someone deciding whether to spend money.
  purpose: string;
}

export const CHANNELS: ChannelMeta[] = [
  {
    key: "temperature",
    label: "Water temperature",
    short: "Temp",
    unit: "°C",
    decimals: 1,
    field: "temperatureC",
    icon: "thermometer",
    purpose: "Drives feeding rates, and corrects every other probe's reading.",
  },
  {
    key: "dissolved_oxygen",
    label: "Dissolved oxygen",
    short: "DO",
    unit: "mg/L",
    decimals: 2,
    field: "dissolvedOxygen",
    icon: "wind",
    purpose: "The one that kills fish fastest. Drives the aerator automatically.",
  },
  {
    key: "ph",
    label: "pH",
    short: "pH",
    unit: "",
    decimals: 2,
    field: "ph",
    icon: "droplet",
    purpose: "Stress indicator, and needed to read ammonia correctly.",
  },
  {
    key: "ammonia",
    label: "Ammonia",
    short: "NH₃",
    unit: "mg/L",
    decimals: 3,
    field: "ammonia",
    icon: "alert-triangle",
    purpose: "Builds up between water changes. Chronic gill damage before it's visible.",
  },
  {
    key: "turbidity",
    label: "Turbidity",
    short: "Turb",
    unit: "NTU",
    decimals: 1,
    field: "turbidityNtu",
    icon: "eye",
    purpose: "Water clarity — tells you when filtration is falling behind.",
  },
  {
    key: "tds",
    label: "Total dissolved solids",
    short: "TDS",
    unit: "ppm",
    decimals: 0,
    field: "tdsPpm",
    icon: "bar-chart-2",
    purpose: "Mineral load. Shares a probe with conductivity.",
  },
  {
    key: "ec",
    label: "Conductivity",
    short: "EC",
    unit: "µS/cm",
    decimals: 0,
    field: "ecUsCm",
    icon: "zap",
    purpose: "The same probe as TDS, read on a different scale.",
  },
  {
    key: "water_level",
    label: "Water level",
    short: "Level",
    unit: "m",
    decimals: 2,
    field: "waterLevelM",
    icon: "bar-chart-2",
    purpose: "Catches a draining raceway before the fish do. Best value on the list.",
  },
  {
    key: "flow",
    label: "Flow rate",
    short: "Flow",
    unit: "L/min",
    decimals: 1,
    field: "flowLpm",
    icon: "activity",
    purpose: "Separates a failed pump from a leak downstream.",
  },
];

export const CHANNEL_BY_KEY: Record<DeviceChannel, ChannelMeta> = CHANNELS.reduce(
  (acc, channel) => ({ ...acc, [channel.key]: channel }),
  {} as Record<DeviceChannel, ChannelMeta>
);

/**
 * Reads a channel's value off a reading.
 *
 * Returns null for absent, and callers must render that as "—", never as 0.
 * This is the single most important invariant in the whole feature: a probe
 * that isn't fitted and a probe reading zero mean completely different
 * things, and only one of them is an emergency.
 */
export function readingValue(reading: DeviceReading | null | undefined, channel: DeviceChannel): number | null {
  if (!reading) return null;
  const value = reading[CHANNEL_BY_KEY[channel].field];
  return typeof value === "number" ? value : null;
}

export function formatChannelValue(value: number | null | undefined, channel: DeviceChannel): string {
  if (typeof value !== "number") return "—";
  const meta = CHANNEL_BY_KEY[channel];
  return `${value.toFixed(meta.decimals)}${meta.unit ? ` ${meta.unit}` : ""}`;
}

export const OUTPUT_LABELS: Record<DeviceOutput, string> = {
  aerator: "Aerator",
  pump: "Pump",
  valve: "Valve",
  aux: "Indicator",
};

/**
 * Channels the firmware calibrates against reference solutions, in two
 * points. Everything else is either factory-accurate enough (temperature,
 * level) or calibrated by entering a known value directly.
 */
export const TWO_POINT_CHANNELS: DeviceChannel[] = ["ph", "dissolved_oxygen", "ammonia"];

/**
 * What to tell the farmer to do for each calibration point.
 *
 * Written as instructions, not as parameter names — someone standing over a
 * raceway with a bottle of buffer solution needs "rinse the probe and put it
 * in the pH 7.00 bottle", not "capture reference point 0".
 */
export const CALIBRATION_STEPS: Partial<
  Record<DeviceChannel, { point: 0 | 1; instruction: string; suggestedValue: number; valueLabel: string }[]>
> = {
  ph: [
    {
      point: 0,
      instruction:
        "Rinse the probe in clean water, shake it dry, and stand it in the pH 7.00 buffer solution. Wait until the reading settles — about 30 seconds.",
      suggestedValue: 7.0,
      valueLabel: "Buffer pH",
    },
    {
      point: 1,
      instruction:
        "Rinse again, then stand the probe in the second buffer — pH 4.00 for acidic water, or 10.01 for alkaline. Use whichever is closer to your raceway.",
      suggestedValue: 4.0,
      valueLabel: "Buffer pH",
    },
  ],
  dissolved_oxygen: [
    {
      point: 0,
      instruction:
        "Put the probe in the zero-oxygen solution that came with it (sodium sulphite). Wait two minutes for the reading to bottom out.",
      suggestedValue: 0,
      valueLabel: "Oxygen (mg/L)",
    },
    {
      point: 1,
      instruction:
        "Rinse the probe, shake off the drops, and hold it in air — not in water. Air-saturated is the second point. Wait one minute.",
      suggestedValue: 8.26,
      valueLabel: "Saturated (mg/L)",
    },
  ],
  ammonia: [
    {
      point: 0,
      instruction: "Stand the electrode in the low ammonia standard (0.1 mg/L). Stir gently and wait for it to settle.",
      suggestedValue: 0.1,
      valueLabel: "Standard (mg/L)",
    },
    {
      point: 1,
      instruction: "Rinse, then stand it in the high standard (10 mg/L). Ion-selective electrodes drift, so redo this each season.",
      suggestedValue: 10,
      valueLabel: "Standard (mg/L)",
    },
  ],
};
