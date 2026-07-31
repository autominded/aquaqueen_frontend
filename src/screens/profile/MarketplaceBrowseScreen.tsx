import React, { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchMarketplaceListings } from "../../api/marketplace";
import { MarketplaceCategory } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { API_ORIGIN } from "../../config";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<ProfileStackParamList, "MarketplaceBrowse">;

const CATEGORIES: { value: MarketplaceCategory | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "LIVESTOCK", label: "Livestock" },
  { value: "FEED_SUPPLIES", label: "Feed & supplies" },
];

export function MarketplaceBrowseScreen({ route, navigation }: Props) {
  const mine = route.params?.mine ?? false;
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);

  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["marketplace-listings", mine, category],
    queryFn: () => fetchMarketplaceListings({ mine, category: category ?? undefined }),
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c.label} onPress={() => setCategory(c.value)}>
                <View style={[styles.chip, category === c.value && styles.chipActive]}>
                  <Text style={[styles.chipLabel, category === c.value && styles.chipLabelActive]}>{c.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        }
        ListEmptyComponent={
          isPending ? (
            <LoadingView />
          ) : isError ? (
            <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />
          ) : (
            <EmptyState title={mine ? "No listings yet" : "Nothing listed yet"} subtitle={mine ? "Post one from the marketplace menu." : "Check back later, or post your own."} />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("MarketplaceListingDetail", { listingId: item.id })}>
            <Card style={styles.card}>
              {item.imageUrl && <Image source={{ uri: `${API_ORIGIN}${item.imageUrl}` }} style={styles.image} />}
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{item.title}</Text>
                {mine && <StatusPill label={item.status} tone={item.status === "ACTIVE" ? "success" : "neutral"} />}
              </View>
              <Text style={styles.meta}>{item.organization.name}</Text>
              <Text style={styles.price}>₹{item.price.toLocaleString()}{item.priceUnit ? ` · ${item.priceUnit}` : ""}</Text>
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
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipLabel: { fontSize: 12, fontWeight: "700", color: colors.inkMuted },
  chipLabelActive: { color: colors.white },
  card: {},
  image: { width: "100%", height: 140, borderRadius: radii.sm, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, flex: 1 },
  meta: { fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  price: { fontSize: 16, fontWeight: "800", color: colors.tealDark, marginTop: 8 },
});
