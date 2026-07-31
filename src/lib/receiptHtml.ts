import { Farm, Sale } from "../api/types";
import { API_ORIGIN } from "../config";

// Every string below is user-entered data (product/contact names, farm
// address, org name) reaching an HTML string that receipt.web.ts renders
// via `document.write` into a same-origin window — unescaped, that's a
// stored-XSS path straight to `window.opener`'s localStorage (the JWT).
// Escape anything that isn't a number formatted by us.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal, professional layout: farm identity up top, when the sale
// happened, who it was for (if a customer is attached), what was bought,
// and the total — no sale id, payment method/status breakdown, or footer
// copy. Shared between receipt.native.ts (expo-print) and receipt.web.ts
// (expo-print's web implementation ignores the html it's given — see
// receipt.web.ts).
export function buildReceiptHtml(sale: Sale, farm: Farm | null, organizationName: string): string {
  const createdAt = new Date(sale.createdAt);

  const rows = sale.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.product?.name ?? "Item")}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">₹${item.lineTotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1c2424; padding: 32px; max-width: 480px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { width: 76px; height: 76px; border-radius: 14px; object-fit: cover; margin: 0 auto 14px; display: block; }
          .farm-name { font-size: 22px; font-weight: 800; color: #0b3b3b; margin: 0; }
          .farm-address { font-size: 13px; color: #7a8787; margin-top: 4px; }
          .divider { border-top: 1px solid #e2e8e8; margin: 20px 0; }
          .meta-row { display: flex; justify-content: space-between; font-size: 13px; color: #3f4a4a; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #7a8787; padding: 0 4px 8px; border-bottom: 2px solid #1c2424; }
          td { font-size: 14px; padding: 10px 4px; border-bottom: 1px solid #e2e8e8; color: #1c2424; }
          .right { text-align: right; }
          .total-box { background: #0b3b3b; color: #ffffff; border-radius: 12px; padding: 18px 20px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center; }
          .total-label { font-size: 14px; font-weight: 600; letter-spacing: 0.3px; }
          .total-value { font-size: 26px; font-weight: 800; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${farm?.photoUrl ? `<img class="logo" src="${escapeHtml(API_ORIGIN + farm.photoUrl)}" />` : ""}
          <p class="farm-name">${escapeHtml(organizationName)}</p>
          ${farm?.address ? `<p class="farm-address">${escapeHtml(farm.address)}</p>` : ""}
        </div>

        <div class="divider"></div>

        <div class="meta-row"><span>Date</span><span>${createdAt.toLocaleDateString()}</span></div>
        <div class="meta-row"><span>Time</span><span>${createdAt.toLocaleTimeString()}</span></div>
        ${sale.contact ? `<div class="meta-row"><span>Customer</span><span>${escapeHtml(sale.contact.name)}</span></div>` : ""}
        ${sale.contact?.phone ? `<div class="meta-row"><span>Phone</span><span>${escapeHtml(sale.contact.phone)}</span></div>` : ""}

        <table>
          <thead>
            <tr><th>Item</th><th class="right">Qty</th><th class="right">Subtotal</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="total-box">
          <span class="total-label">Total</span>
          <span class="total-value">₹${sale.totalAmount.toFixed(2)}</span>
        </div>
      </body>
    </html>
  `;
}
