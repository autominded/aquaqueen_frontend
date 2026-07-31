import { useQuery } from "@tanstack/react-query";
import { fetchActiveAdvisories } from "../api/advisories";

// Same queryKey/queryFn as AdvisoryBanner — React Query shares one cache
// entry and one poll for both, so mounting this at the tab-navigator level
// (always alive, unlike the banner which only exists on Dashboard) keeps
// the tab badge current no matter which tab the user is actually on.
export function useAdvisoryPoll() {
  const { data } = useQuery({ queryKey: ["advisories"], queryFn: fetchActiveAdvisories, refetchInterval: 60000 });
  return data?.length ?? 0;
}
