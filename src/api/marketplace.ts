import { apiClient } from "./client";
import {
  MarketplaceCategory,
  MarketplaceConversationDetail,
  MarketplaceConversationSummary,
  MarketplaceListing,
  MarketplaceMessage,
  MarketplaceStatus,
} from "./types";

export function fetchMarketplaceListings(params?: { mine?: boolean; category?: MarketplaceCategory }) {
  return apiClient
    .get<{ listings: MarketplaceListing[] }>("/marketplace/listings", {
      params: { mine: params?.mine ? "true" : undefined, category: params?.category },
    })
    .then((r) => r.data.listings);
}

export function fetchMarketplaceListing(id: string) {
  return apiClient.get<{ listing: MarketplaceListing }>(`/marketplace/listings/${id}`).then((r) => r.data.listing);
}

export function createMarketplaceListing(input: {
  category: MarketplaceCategory;
  title: string;
  description: string;
  price: number;
  priceUnit?: string;
}) {
  return apiClient.post<{ listing: MarketplaceListing }>("/marketplace/listings", input).then((r) => r.data.listing);
}

export function updateMarketplaceListing(id: string, input: Partial<{ status: MarketplaceStatus; price: number; priceUnit: string; title: string; description: string }>) {
  return apiClient.patch<{ listing: MarketplaceListing }>(`/marketplace/listings/${id}`, input).then((r) => r.data.listing);
}

export function deleteMarketplaceListing(id: string) {
  return apiClient.delete(`/marketplace/listings/${id}`);
}

export function uploadMarketplaceListingPhoto(id: string, file: { uri: string; name: string; type: string; file?: File }) {
  const form = new FormData();
  if (file.file) {
    form.append("photo", file.file, file.name);
  } else {
    form.append("photo", file as unknown as Blob);
  }
  return apiClient
    .post<{ listing: MarketplaceListing }>(`/marketplace/listings/${id}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.listing);
}

export function sendMarketplaceListingMessage(listingId: string, body: string) {
  return apiClient
    .post<{ conversationId: string; message: MarketplaceMessage }>(`/marketplace/listings/${listingId}/messages`, { body })
    .then((r) => r.data);
}

export function fetchMarketplaceConversations() {
  return apiClient.get<{ conversations: MarketplaceConversationSummary[] }>("/marketplace/conversations").then((r) => r.data.conversations);
}

export function fetchMarketplaceConversationMessages(conversationId: string) {
  return apiClient
    .get<{ conversation: MarketplaceConversationDetail; messages: MarketplaceMessage[] }>(`/marketplace/conversations/${conversationId}/messages`)
    .then((r) => r.data);
}

export function sendMarketplaceConversationMessage(conversationId: string, body: string) {
  return apiClient
    .post<{ message: MarketplaceMessage }>(`/marketplace/conversations/${conversationId}/messages`, { body })
    .then((r) => r.data.message);
}
