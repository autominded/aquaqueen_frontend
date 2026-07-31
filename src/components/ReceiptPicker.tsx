import React from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Card } from "./Card";
import { notify } from "../lib/notify";
import { colors, radii } from "../theme";

export interface ReceiptDraft {
  uri: string;
  name: string;
  type: string;
  // Web only: the real File/Blob. FormData on web needs an actual Blob to
  // attach a file — the { uri, name, type } descriptor only works with React
  // Native's own multipart handling on native platforms, not the browser's.
  file?: File;
}

interface Props {
  draft: ReceiptDraft | null;
  onPick: (file: ReceiptDraft) => void;
  existingUrl?: string | null;
  onRemove?: () => void;
  removing?: boolean;
  // Lets MortalityEntryScreen reuse this for a plain photo instead of a
  // receipt (photo or PDF) — defaults preserve the original receipt copy.
  fileTypes?: string[];
  fallbackName?: string;
  promptLabel?: string;
  uploadedLabel?: string;
  viewLabel?: string;
}

// Shared by New Purchase and Edit Purchase — mirrors FarmSetupScreen's
// pickDocument convention (tap the card to pick/replace), plus a view/remove
// pair since a receipt is optional and removable, unlike farm's mandatory docs.
export function ReceiptPicker({
  draft,
  onPick,
  existingUrl,
  onRemove,
  removing,
  fileTypes = ["application/pdf", "image/*"],
  fallbackName = "receipt",
  promptLabel = "Tap to attach a receipt (photo or PDF)",
  uploadedLabel = "Receipt uploaded — tap to replace",
  viewLabel = "View receipt",
}: Props) {
  const pick = async () => {
    // base64 explicitly false: we upload via the file's uri, and on web the
    // public API's own default (base64: true) forces a FileReader read that
    // can fail there for large/binary files we never actually use.
    const result = await DocumentPicker.getDocumentAsync({
      type: fileTypes,
      copyToCacheDirectory: true,
      base64: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    onPick({
      uri: asset.uri,
      name: asset.name ?? asset.uri.split("/").pop() ?? fallbackName,
      type: asset.mimeType ?? "application/octet-stream",
      file: asset.file,
    });
  };

  const viewExisting = () => {
    if (!existingUrl) return;
    Linking.openURL(existingUrl).catch(() => notify("Couldn't open file"));
  };

  return (
    <View>
      <TouchableOpacity onPress={pick}>
        <Card style={styles.card}>
          <Text style={styles.text}>{draft?.name ?? (existingUrl ? uploadedLabel : promptLabel)}</Text>
        </Card>
      </TouchableOpacity>
      {(existingUrl || onRemove) && (
        <View style={styles.actionsRow}>
          {existingUrl && !draft && <TouchableOpacity onPress={viewExisting}><Text style={styles.link}>{viewLabel}</Text></TouchableOpacity>}
          {(draft || existingUrl) && onRemove && (
            <TouchableOpacity onPress={onRemove} disabled={removing}>
              <Text style={styles.removeLink}>{removing ? "Removing…" : "Remove"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  text: { fontSize: 13, color: colors.inkMuted },
  actionsRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  link: { fontSize: 13, fontWeight: "700", color: colors.teal },
  removeLink: { fontSize: 13, fontWeight: "700", color: colors.coral },
});
