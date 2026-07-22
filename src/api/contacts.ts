import { apiClient } from "./client";
import { Contact, ContactType } from "./types";

export function fetchContacts(type?: ContactType) {
  return apiClient
    .get<{ contacts: Contact[] }>("/contacts", { params: type ? { type } : undefined })
    .then((r) => r.data.contacts);
}

export function createContact(input: {
  type: ContactType;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}) {
  return apiClient.post<{ contact: Contact }>("/contacts", input).then((r) => r.data.contact);
}
