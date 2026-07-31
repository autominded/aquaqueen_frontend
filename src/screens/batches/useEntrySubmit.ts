import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { notify } from "../../lib/notify";

// Shared success behavior for the four entry-creation screens (feed, sampling,
// mortality, water quality): invalidate the relevant list + batch summary,
// confirm the save, and return to Batch Details (or Raceway Operations).
export function useEntrySubmit<T>(mutationFn: () => Promise<T>, batchId: string, listQueryKey: string, racewayId?: string) {
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listQueryKey, batchId] });
      queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      if (racewayId) queryClient.invalidateQueries({ queryKey: ["raceway-operations", racewayId] });
      notify("Saved", "Entry recorded successfully.");
      navigation.goBack();
    },
  });
}
