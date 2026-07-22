import { PurchaseCategory } from "../../api/types";

export const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  "FEED",
  "FINGERLINGS_EGGS",
  "CHEMICALS_TREATMENTS",
  "MEDICATION",
  "EQUIPMENT",
  "PACKAGING_ICE",
  "FUEL_UTILITIES",
  "MAINTENANCE_SUPPLIES",
  "OTHER",
];

export const CATEGORY_LABEL: Record<PurchaseCategory, string> = {
  FEED: "Feed",
  FINGERLINGS_EGGS: "Fingerlings & Eggs",
  CHEMICALS_TREATMENTS: "Chemicals & Treatments",
  MEDICATION: "Medication",
  EQUIPMENT: "Equipment",
  PACKAGING_ICE: "Packaging & Ice",
  FUEL_UTILITIES: "Fuel & Utilities",
  MAINTENANCE_SUPPLIES: "Maintenance Supplies",
  OTHER: "Other",
};
