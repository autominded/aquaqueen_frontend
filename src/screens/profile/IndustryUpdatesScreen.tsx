import React from "react";
import { FlatList, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchIndustryPosts } from "../../api/industryPosts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { API_ORIGIN } from "../../config";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function IndustryUpdatesScreen() {
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["industry-posts"],
    queryFn: fetchIndustryPosts,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No updates yet" subtitle="Check back later for industry news and updates." />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            {item.imageUrl && <Image source={{ uri: `${API_ORIGIN}${item.imageUrl}` }} style={styles.image} />}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            {item.linkUrl && (
              <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(item.linkUrl!).catch(() => {})}>
                <AppIcon name="external-link" size={14} color={colors.teal} />
                <Text style={styles.link}>Read more</Text>
              </TouchableOpacity>
            )}
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
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  card: {},
  image: { width: "100%", height: 160, borderRadius: radii.sm, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  body: { fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 18 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  link: { fontSize: 13, fontWeight: "700", color: colors.teal },
  meta: { fontSize: 11, color: colors.inkMuted, marginTop: 10 },
});
