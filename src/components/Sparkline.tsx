import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radii } from "../theme";

interface Props {
  /**
   * One value per bucket, oldest first. `null` means no reading for that
   * bucket — a probe that wasn't fitted, had faulted, or a stretch where the
   * device was offline.
   */
  values: (number | null)[];
  height?: number;
  /** Tints the whole series when the channel is currently in breach. */
  tone?: "normal" | "critical";
}

/**
 * A bar sparkline for one sensor channel.
 *
 * Bars rather than a line because a line has to interpolate across gaps, and
 * gaps are the thing that must stay visible here: a raceway whose probe went
 * dark for three hours has to look different from one that read steadily. A
 * missing bucket renders as empty space, never as a zero-height bar sitting on
 * the baseline — that would read as "the oxygen went to zero", which is a
 * fish-kill, not a wiring fault.
 *
 * Built out of Views rather than SVG deliberately: the app has no charting
 * dependency and this needs none. Nine of these render per device screen, so
 * cheapness matters more than smooth curves.
 *
 * One series per chart, so there is no legend and no categorical palette —
 * the tile's own label names it. Colour is carried by the accent on the most
 * recent bar; history is the same hue de-emphasised, so the eye lands on
 * "now" without a second colour entering the picture.
 */
export function Sparkline({ values, height = 34, tone = "normal" }: Props) {
  const bars = useMemo(() => {
    const present = values.filter((value): value is number => value !== null);

    if (present.length === 0) return [];

    const min = Math.min(...present);
    const max = Math.max(...present);
    const span = max - min;

    return values.map((value) => {
      if (value === null) return null;

      // A dead-flat series has zero span. Dividing by it gives NaN, and
      // rendering every bar at full height would imply a range that isn't
      // there — so a flat series sits at half height, which reads as "steady".
      if (span === 0) return 0.5;

      // Floored at 12% so the minimum reading is still a visible mark rather
      // than a bar of zero height, which would be indistinguishable from the
      // "no data" case above.
      return 0.12 + ((value - min) / span) * 0.88;
    });
  }, [values]);

  if (bars.length === 0) {
    return <View style={[styles.container, { height }]} />;
  }

  const lastPresentIndex = bars.reduce<number>((last, bar, index) => (bar !== null ? index : last), -1);

  return (
    <View style={[styles.container, { height }]}>
      {bars.map((fraction, index) => {
        if (fraction === null) {
          // Deliberately empty: the gap IS the information.
          return <View key={index} style={styles.bar} />;
        }

        const isCurrent = index === lastPresentIndex;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${fraction * 100}%`,
                backgroundColor:
                  tone === "critical"
                    ? isCurrent
                      ? colors.coral
                      : colors.coralSoft
                    : isCurrent
                      ? colors.teal
                      : colors.tealSoft,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/**
 * Buckets readings into a fixed number of slots for the sparkline.
 *
 * Returns `null` for any slot with no readings, which is what preserves
 * offline stretches as visible gaps instead of quietly closing them up.
 * Averages within a slot rather than sampling one reading, so a single noisy
 * spike doesn't become the whole bar.
 */
export function bucketReadings<T>(
  items: T[],
  getTime: (item: T) => number,
  getValue: (item: T) => number | null,
  buckets = 24,
  windowStart?: number,
  windowEnd?: number
): (number | null)[] {
  if (items.length === 0) return new Array(buckets).fill(null);

  const start = windowStart ?? getTime(items[0]);
  const end = windowEnd ?? getTime(items[items.length - 1]);
  const span = end - start;

  if (span <= 0) {
    const single = getValue(items[items.length - 1]);
    return new Array(buckets).fill(null).map((_, i) => (i === buckets - 1 ? single : null));
  }

  const sums = new Array(buckets).fill(0);
  const counts = new Array(buckets).fill(0);

  for (const item of items) {
    const value = getValue(item);
    if (value === null) continue;

    const index = Math.min(buckets - 1, Math.floor(((getTime(item) - start) / span) * buckets));
    if (index < 0) continue;

    sums[index] += value;
    counts[index] += 1;
  }

  return sums.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : null));
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  bar: {
    flex: 1,
    minWidth: 2,
    // Rounded data-end, anchored to the baseline.
    borderTopLeftRadius: radii.sm / 4,
    borderTopRightRadius: radii.sm / 4,
  },
});
