import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { createMarketplaceListing, uploadMarketplaceListingPhoto } from "../../api/marketplace";
import { MarketplaceCategory } from "../../api/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { SelectField } from "../../components/SelectField";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "NewMarketplaceListing">;

const CATEGORY_OPTIONS: { value: MarketplaceCategory; label: string }[] = [
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "LIVESTOCK", label: "Livestock" },
  { value: "FEED_SUPPLIES", label: "Feed & supplies" },
];

export function NewMarketplaceListingScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<MarketplaceCategory | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("");
  const [photo, setPhoto] = useState<ReceiptDraft | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createMarketplaceListing({
        category: category!,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        priceUnit: priceUnit.trim() || undefined,
      }),
    onSuccess: async (listing) => {
      if (photo) {
        try {
          await uploadMarketplaceListingPhoto(listing.id, photo);
        } catch {
          notify("Listing posted", "The photo couldn't be uploaded — you can leave it without one.");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      navigation.goBack();
    },
  });

  const canSubmit = category && title.trim() && description.trim() && Number(price) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <SelectField label="Category" value={category ?? null} onSelect={(v) => setCategory(v as MarketplaceCategory)} options={CATEGORY_OPTIONS} placeholder="Select category" />
      <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Used paddlewheel aerator" />
      <FormField label="Description" value={description} onChangeText={setDescription} placeholder="Condition, specs, why you're selling…" multiline />
      <FormField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="15000" />
      <FormField label="Price unit (optional)" value={priceUnit} onChangeText={setPriceUnit} placeholder="total, per kg, per piece…" />
      <Text style={styles.pickerLabel}>Photo (optional)</Text>
      <ReceiptPicker
        draft={photo}
        onPick={setPhoto}
        onRemove={photo ? () => setPhoto(null) : undefined}
        fileTypes={["image/*"]}
        fallbackName="listing-photo"
        promptLabel="Tap to attach a photo"
        uploadedLabel="Photo attached"
      />
      <PrimaryButton title="Post listing" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} style={styles.submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  pickerLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  submit: { marginTop: 16 },
});
