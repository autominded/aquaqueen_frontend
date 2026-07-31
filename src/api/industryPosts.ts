import { apiClient } from "./client";
import { AdminIndustryPost, IndustryPost } from "./types";

export function fetchIndustryPosts() {
  return apiClient.get<{ posts: IndustryPost[] }>("/industry-posts").then((r) => r.data.posts);
}

export function fetchAllIndustryPosts() {
  return apiClient.get<{ posts: AdminIndustryPost[] }>("/admin/industry-posts").then((r) => r.data.posts);
}

export function createIndustryPost(input: { title: string; body: string; linkUrl?: string }) {
  return apiClient.post<{ post: AdminIndustryPost }>("/admin/industry-posts", input).then((r) => r.data.post);
}

export function uploadIndustryPostPhoto(id: string, file: { uri: string; name: string; type: string; file?: File }) {
  const form = new FormData();
  if (file.file) {
    form.append("photo", file.file, file.name);
  } else {
    form.append("photo", file as unknown as Blob);
  }
  return apiClient
    .post<{ post: AdminIndustryPost }>(`/admin/industry-posts/${id}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.post);
}

export function deleteIndustryPost(id: string) {
  return apiClient.delete(`/admin/industry-posts/${id}`);
}
