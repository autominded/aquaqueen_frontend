import React from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchMarketplaceConversations } from "../../api/marketplace";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { API_ORIGIN } from "../../config";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<ProfileStackParamList, "MarketplaceConversations">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MarketplaceConversationsScreen({ navigation }: Props) {
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["marketplace-conversations"],
    queryFn: fetchMarketplaceConversations,
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
        ListEmptyComponent={<EmptyState title="No conversations yet" subtitle="Message a seller from a listing to start one." />}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("MarketplaceConversation", { conversationId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.row}>
                {item.listing.imageUrl ? (
                  <Image source={{ uri: `${API_ORIGIN}${item.listing.imageUrl}` }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder} />
                )}
                <View style={styles.copy}>
                  <Text style={styles.listingTitle}>{item.listing.title}</Text>
                  <Text style={styles.counterparty}>{item.counterparty.name}</Text>
                  {item.lastMessage && (
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage.body}</Text>
                  )}
                </View>
                {item.lastMessage && <Text style={styles.date}>{formatDate(item.lastMessage.createdAt)}</Text>}
              </View>
            </Card>
          </TouchableOpacity>
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
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 48, height: 48, borderRadius: radii.sm },
  thumbPlaceholder: { width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.tealSoft },
  copy: { flex: 1 },
  listingTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  counterparty: { fontSize: 12, color: colors.teal, fontWeight: "700", marginTop: 2 },
  lastMessage: { fontSize: 12, color: colors.inkMuted, marginTop: 3 },
  date: { fontSize: 11, color: colors.inkMuted },
});
