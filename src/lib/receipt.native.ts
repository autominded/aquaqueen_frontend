import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Farm, Sale } from "../api/types";
import { buildReceiptHtml } from "./receiptHtml";

export async function printReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  await Print.printAsync({ html: buildReceiptHtml(sale, farm, organizationName) });
}

export async function shareReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(sale, farm, organizationName) });
  await Sharing.shareAsync(uri);
}
