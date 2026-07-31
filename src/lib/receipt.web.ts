import { Farm, Sale } from "../api/types";
import { buildReceiptHtml } from "./receiptHtml";

// expo-print's own web implementation ignores the `html` it's given
// entirely and just calls window.print() on whatever page is currently
// open (see node_modules/expo-print/src/ExponentPrint.web.ts) — so on web
// the receipt has to be printed a different way: open it in its own window
// and print/save-as-PDF that instead.
function openReceiptWindow(sale: Sale, farm: Farm | null, organizationName: string): Window {
  const win = window.open("", "_blank");
  if (!win) throw new Error("Pop-up blocked — allow pop-ups for this site to print or share a receipt.");
  win.document.open();
  win.document.write(buildReceiptHtml(sale, farm, organizationName));
  win.document.close();
  return win;
}

export async function printReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  const win = openReceiptWindow(sale, farm, organizationName);
  win.onload = () => {
    win.focus();
    win.print();
  };
}

export async function shareReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  // No native share sheet on web — every modern browser's print dialog
  // offers "Save as PDF", which is the closest equivalent.
  await printReceipt(sale, farm, organizationName);
}
