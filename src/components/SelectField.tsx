import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";

interface Option {
  label: string;
  value: string;
  subtitle?: string;
}

interface Props {
  label: string;
  value: string | null | undefined;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string;
}

// A tappable field that opens a modal list — the app's stand-in for a native
// <select>, used everywhere a field should pick from a fixed or
// server-managed list instead of free text (species, stage, raceway,
// accounts, categories, contacts…).
export function SelectField({ label, value, options, onSelect, placeholder = "Select…", error }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={selected ? styles.valueText : styles.placeholderText} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <AppIcon name="chevron-down" size={18} color={colors.inkMuted} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>Nothing to pick from yet.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.value);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionLabel}>{item.label}</Text>
                    {item.subtitle && <Text style={styles.optionSubtitle}>{item.subtitle}</Text>}
                  </View>
                  {item.value === value && <AppIcon name="check" size={18} color={colors.teal} />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

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
  valueText: { fontSize: 15, color: colors.ink, flexShrink: 1 },
  placeholderText: { fontSize: 15, color: "#9aa5a5", flexShrink: 1 },
  error: { color: colors.coral, fontSize: 12, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(7,59,76,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 16, maxHeight: "70%" },
  sheetTitle: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: 10 },
  list: { flexGrow: 0 },
  emptyText: { fontSize: 13, color: colors.inkMuted, paddingVertical: 20, textAlign: "center" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionCopy: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: "600", color: colors.ink },
  optionSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  cancelButton: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  cancelText: { fontSize: 14, fontWeight: "700", color: colors.teal },
});
