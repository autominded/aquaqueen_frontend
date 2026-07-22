import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Farm, Sale } from "../api/types";

// Mirrors the information architecture of a typical POS receipt (header,
// line items, totals, payments, footer) without the multi-layout/thermal-
// printer machinery a bigger retail system like UltimatePOS needs — this
// app has one farm and one fixed layout.
function buildReceiptHtml(sale: Sale, farm: Farm | null, organizationName: string): string {
  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const due = Math.max(0, Math.round((sale.totalAmount - paid) * 100) / 100);

  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td>${item.product?.name ?? "Item"}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">$${item.unitPrice.toFixed(2)}</td>
          <td class="right">$${item.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const paymentRows = sale.payments
    .map((p) => `<tr><td>${p.account?.name ?? "Account"}</td><td class="right">$${p.amount.toFixed(2)}</td></tr>`)
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1c2424; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #7a8787; font-size: 13px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th, td { text-align: left; padding: 6px 4px; font-size: 13px; border-bottom: 1px solid #e2e8e8; }
          .right { text-align: right; }
          .totals td { border-bottom: none; }
          .grand { font-weight: 700; font-size: 15px; }
          .footer { margin-top: 24px; font-size: 12px; color: #7a8787; text-align: center; }
        </style>
      </head>
      <body>
        <h1>${organizationName}</h1>
        ${farm?.address ? `<div class="meta">${farm.address}</div>` : ""}
        <div class="meta">
          Sale receipt · ${new Date(sale.createdAt).toLocaleString()}<br/>
          Sale #${sale.id.slice(0, 8).toUpperCase()}
          ${sale.contact ? `<br/>Customer: ${sale.contact.name}` : ""}
        </div>

        <table>
          <thead>
            <tr><th>Item</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Line total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <table class="totals">
          <tr><td>Total</td><td class="right grand">$${sale.totalAmount.toFixed(2)}</td></tr>
          <tr><td>Paid</td><td class="right">$${paid.toFixed(2)}</td></tr>
          <tr><td>Due</td><td class="right">$${due.toFixed(2)}</td></tr>
          <tr><td>Status</td><td class="right">${sale.paymentStatus}</td></tr>
        </table>

        ${
          sale.payments.length > 0
            ? `<table><thead><tr><th>Paid via</th><th class="right">Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>`
            : ""
        }

        <div class="footer">Thank you for your business.</div>
      </body>
    </html>
  `;
}

export async function printReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  await Print.printAsync({ html: buildReceiptHtml(sale, farm, organizationName) });
}

export async function shareReceipt(sale: Sale, farm: Farm | null, organizationName: string) {
  const { uri } = await Print.printToFileAsync({ html: buildReceiptHtml(sale, farm, organizationName) });
  await Sharing.shareAsync(uri);
}
