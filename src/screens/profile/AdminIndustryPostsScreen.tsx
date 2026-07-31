import React, { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIndustryPost, deleteIndustryPost, fetchAllIndustryPosts, uploadIndustryPostPhoto } from "../../api/industryPosts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { confirmAction } from "../../lib/confirm";
import { API_ORIGIN } from "../../config";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminIndustryPostsScreen() {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-industry-posts"],
    queryFn: fetchAllIndustryPosts,
  });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [photo, setPhoto] = useState<ReceiptDraft | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-industry-posts"] });
    queryClient.invalidateQueries({ queryKey: ["industry-posts"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createIndustryPost({ title: title.trim(), body: body.trim(), linkUrl: linkUrl.trim() || undefined }),
    onSuccess: async (post) => {
      if (photo) {
        try {
          await uploadIndustryPostPhoto(post.id, photo);
        } catch {
          notify("Post published", "The photo couldn't be uploaded — you can leave it without one.");
        }
      }
      invalidate();
      setAdding(false);
      setTitle("");
      setBody("");
      setLinkUrl("");
      setPhoto(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIndustryPost(id),
    onSuccess: invalidate,
    onError: (err) => notify("Couldn't delete post", apiErrorMessage(err)),
  });

  const canSubmit = title.trim() && body.trim();

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.addSection}>
            {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
            {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
            {adding ? (
              <Card style={styles.addCard}>
                <FormField label="Title" value={title} onChangeText={setTitle} placeholder="New disease-resistant trout strain released" />
                <FormField label="Body" value={body} onChangeText={setBody} placeholder="Summary of the update…" multiline />
                <FormField label="Link (optional)" value={linkUrl} onChangeText={setLinkUrl} placeholder="https://…" autoCapitalize="none" />
                <Text style={styles.pickerLabel}>Photo (optional)</Text>
                <ReceiptPicker
                  draft={photo}
                  onPick={setPhoto}
                  onRemove={photo ? () => setPhoto(null) : undefined}
                  fileTypes={["image/*"]}
                  fallbackName="industry-post-photo"
                  promptLabel="Tap to attach a photo"
                  uploadedLabel="Photo attached"
                />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={styles.addButton} />
                  <PrimaryButton title="Publish" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ New update</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No updates yet" subtitle="Publish one above to reach every user across every farm." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {item.imageUrl && <Image source={{ uri: `${API_ORIGIN}${item.imageUrl}` }} style={styles.image} />}
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <TouchableOpacity
                accessibilityLabel="Delete post"
                onPress={() => confirmAction({ title: "Delete update?", message: "This removes it for every user.", confirmLabel: "Delete", destructive: true }, () => deleteMutation.mutate(item.id))}
              >
                <Text style={styles.deleteLink}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingVertical: 16 },
  addSection: { paddingHorizontal: 16, marginBottom: 4 },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 12 },
  addCard: { marginHorizontal: 0, marginBottom: 12 },
  pickerLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  addActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  addButton: { flex: 1 },
  card: {},
  image: { width: "100%", height: 140, borderRadius: radii.sm, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, flex: 1 },
  deleteLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
  body: { fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.inkMuted, marginTop: 8 },
});
