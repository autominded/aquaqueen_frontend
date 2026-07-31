import React, { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { deleteMarketplaceListing, fetchMarketplaceListing, sendMarketplaceListingMessage, updateMarketplaceListing } from "../../api/marketplace";
import { MarketplaceStatus } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { useAuth } from "../../context/AuthContext";
import { API_ORIGIN } from "../../config";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "MarketplaceListingDetail">;

const STATUS_OPTIONS: { value: MarketplaceStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD", label: "Sold" },
  { value: "REMOVED", label: "Removed" },
];

export function MarketplaceListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params;
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { refreshing, onRefresh } = useRefreshing();
  const { data: listing, isPending, isError, error, refetch } = useQuery({
    queryKey: ["marketplace-listing", listingId],
    queryFn: () => fetchMarketplaceListing(listingId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: MarketplaceStatus) => updateMarketplaceListing(listingId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMarketplaceListing(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      navigation.goBack();
    },
    onError: (err) => notify("Couldn't delete listing", apiErrorMessage(err)),
  });

  const messageMutation = useMutation({
    mutationFn: () => sendMarketplaceListingMessage(listingId, message.trim()),
    onSuccess: ({ conversationId }) => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["marketplace-conversations"] });
      navigation.replace("MarketplaceConversation", { conversationId });
    },
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  const isMine = listing.organizationId === user?.organizationId;

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      {listing.imageUrl && <Image source={{ uri: `${API_ORIGIN}${listing.imageUrl}` }} style={styles.image} />}
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{listing.title}</Text>
        <StatusPill label={listing.status} tone={listing.status === "ACTIVE" ? "success" : "neutral"} />
      </View>
      <Text style={styles.seller}>{listing.organization.name}</Text>
      <Text style={styles.price}>₹{listing.price.toLocaleString()}{listing.priceUnit ? ` · ${listing.priceUnit}` : ""}</Text>
      <Text style={styles.description}>{listing.description}</Text>

      {isMine ? (
        hasPermission("marketplace.manage") && (
          <Card style={styles.manageCard}>
            <Text style={styles.manageTitle}>Manage listing</Text>
            {statusMutation.isError && <ErrorBanner message={apiErrorMessage(statusMutation.error)} />}
            <SelectField label="Status" value={listing.status} onSelect={(v) => statusMutation.mutate(v as MarketplaceStatus)} options={STATUS_OPTIONS} />
            <PrimaryButton
              title="Delete listing"
              variant="secondary"
              onPress={() =>
                confirmAction({ title: "Delete listing?", message: "This removes it from the marketplace.", confirmLabel: "Delete", destructive: true }, () => deleteMutation.mutate())
              }
              loading={deleteMutation.isPending}
              style={styles.deleteButton}
            />
          </Card>
        )
      ) : (
        <Card style={styles.manageCard}>
          <Text style={styles.manageTitle}>Message seller</Text>
          {messageMutation.isError && <ErrorBanner message={apiErrorMessage(messageMutation.error)} />}
          <FormField label="Message" value={message} onChangeText={setMessage} placeholder="Is this still available?" multiline />
          <PrimaryButton title="Send" onPress={() => messageMutation.mutate()} loading={messageMutation.isPending} disabled={!message.trim()} style={styles.deleteButton} />
        </Card>
      )}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  image: { width: "100%", height: 220, borderRadius: radii.md, marginBottom: 14 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink, flex: 1 },
  seller: { fontSize: 13, color: colors.inkMuted, marginTop: 6 },
  price: { fontSize: 22, fontWeight: "800", color: colors.tealDark, marginTop: 10 },
  description: { fontSize: 14, color: colors.ink, marginTop: 14, lineHeight: 20 },
  manageCard: { marginHorizontal: 0, marginTop: 20 },
  manageTitle: { fontSize: 14, fontWeight: "800", color: colors.ocean, marginBottom: 10 },
  deleteButton: { marginTop: 12 },
});
