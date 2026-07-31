import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchMarketplaceConversationMessages, sendMarketplaceConversationMessage } from "../../api/marketplace";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "MarketplaceConversation">;

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function MarketplaceConversationScreen({ route }: Props) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["marketplace-conversation", conversationId],
    queryFn: () => fetchMarketplaceConversationMessages(conversationId),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendMarketplaceConversationMessage(conversationId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["marketplace-conversation", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-conversations"] });
    },
  });

  useEffect(() => {
    if (data) scrollRef.current?.scrollToEnd({ animated: false });
  }, [data?.messages.length]);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.listingBar}>
        <Text style={styles.listingTitle}>{data.conversation.listing.title}</Text>
        <Text style={styles.listingPrice}>₹{data.conversation.listing.price.toLocaleString()}{data.conversation.listing.priceUnit ? ` · ${data.conversation.listing.priceUnit}` : ""}</Text>
      </View>
      <RefreshableScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        {data.messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <View key={m.id} style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
              </View>
              <Text style={styles.bubbleMeta}>{m.sender?.name ?? ""} · {formatTime(m.createdAt)}</Text>
            </View>
          );
        })}
      </RefreshableScrollView>
      <View style={styles.composer}>
        {sendMutation.isError && <ErrorBanner message={apiErrorMessage(sendMutation.error)} />}
        <View style={styles.composerRow}>
          <FormField label="" value={draft} onChangeText={setDraft} placeholder="Type a message…" style={styles.composerField} />
          <PrimaryButton title="Send" onPress={() => sendMutation.mutate()} loading={sendMutation.isPending} disabled={!draft.trim()} style={styles.sendButton} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listingBar: { padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  listingTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  listingPrice: { fontSize: 12, color: colors.teal, fontWeight: "700", marginTop: 2 },
  messages: { padding: 16, gap: 12 },
  bubbleRow: { alignItems: "flex-start" },
  bubbleRowMine: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 10 },
  bubbleMine: { backgroundColor: colors.teal, borderColor: colors.teal },
  bubbleText: { fontSize: 13, color: colors.ink },
  bubbleTextMine: { color: colors.white },
  bubbleMeta: { fontSize: 10, color: colors.inkMuted, marginTop: 3 },
  composer: { padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  composerRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  composerField: { flex: 1 },
  sendButton: { paddingHorizontal: 18 },
});
