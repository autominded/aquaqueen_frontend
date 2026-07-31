import React, { useState } from "react";
import { Modal, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";

interface Props {
  label: string;
  // ISO "YYYY-MM-DD", matching what every date schema on the server expects
  // (z.coerce.date() parses this natively) — only the on-screen display is
  // DD/MM/YYYY, the value passed to onChange stays ISO.
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  error?: string;
  // Affects the field's outer container only — same row-sharing convention
  // as FormField's own `style` prop.
  style?: StyleProp<ViewStyle>;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDisplay(iso: string) {
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  return { year: parts[0], month: parts[1] - 1, day: parts[2] };
}

// A tappable field that opens a calendar picker — same modal-sheet
// convention as SelectField, used wherever a date field should be picked
// from a calendar instead of typed as free text.
export function DateField({ label, value, onChange, placeholder = "DD/MM/YYYY", error, style }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = parseIso(value);
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const openPicker = () => {
    const p = parseIso(value);
    setViewYear(p?.year ?? today.getFullYear());
    setViewMonth(p?.month ?? today.getMonth());
    setOpen(true);
  };

  const changeMonth = (delta: number) => {
    let month = viewMonth + delta;
    let year = viewYear;
    if (month < 0) { month = 11; year -= 1; }
    if (month > 11) { month = 0; year += 1; }
    setViewMonth(month);
    setViewYear(year);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isSelected = (day: number) => parsed?.year === viewYear && parsed?.month === viewMonth && parsed?.day === day;
  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.field, error ? styles.fieldError : null]} onPress={openPicker} accessibilityRole="button">
        <Text style={value ? styles.valueText : styles.placeholderText}>{value ? formatDisplay(value) : placeholder}</Text>
        <AppIcon name="calendar" size={18} color={colors.inkMuted} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.monthRow}>
              <TouchableOpacity onPress={() => changeMonth(-1)} accessibilityLabel="Previous month" hitSlop={8}>
                <AppIcon name="chevron-left" size={20} color={colors.teal} />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={() => changeMonth(1)} accessibilityLabel="Next month" hitSlop={8}>
                <AppIcon name="chevron-right" size={20} color={colors.teal} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => (
                <View key={w} style={styles.weekdayCell}>
                  <Text style={styles.weekdayText}>{w}</Text>
                </View>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => (
                <View key={i} style={styles.cell}>
                  {day != null && (
                    <TouchableOpacity
                      style={[styles.dayButton, isSelected(day) && styles.dayButtonSelected]}
                      onPress={() => {
                        onChange(toIso(viewYear, viewMonth, day));
                        setOpen(false);
                      }}
                    >
                      <Text style={[styles.dayText, isSelected(day) && styles.dayTextSelected, !isSelected(day) && isToday(day) && styles.dayTextToday]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fieldError: { borderColor: colors.coral },
  valueText: { fontSize: 15, color: colors.ink },
  placeholderText: { fontSize: 15, color: "#9aa5a5" },
  error: { color: colors.coral, fontSize: 12, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(7,59,76,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 16, alignItems: "center" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, width: CELL_SIZE * 7 },
  monthLabel: { fontSize: 15, fontWeight: "800", color: colors.ink },
  weekdayRow: { flexDirection: "row", width: CELL_SIZE * 7 },
  weekdayCell: { width: CELL_SIZE, alignItems: "center", marginBottom: 6 },
  weekdayText: { fontSize: 12, fontWeight: "700", color: colors.inkMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", width: CELL_SIZE * 7 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  dayButton: { width: CELL_SIZE - 6, height: CELL_SIZE - 6, borderRadius: (CELL_SIZE - 6) / 2, alignItems: "center", justifyContent: "center" },
  dayButtonSelected: { backgroundColor: colors.teal },
  dayText: { fontSize: 14, color: colors.ink },
  dayTextSelected: { color: colors.white, fontWeight: "800" },
  dayTextToday: { color: colors.teal, fontWeight: "800" },
  cancelButton: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  cancelText: { fontSize: 14, fontWeight: "700", color: colors.teal },
});
