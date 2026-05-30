/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, CashierExpense, OperationalExpense } from "../types";
import { formatIndoDate } from "./format";

interface SyncStatus {
  success: boolean;
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

// Check if a linked sheet is still valid in Google Drive
export const verifySpreadsheetExists = async (
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> => {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.status === 200;
  } catch (error) {
    console.error("Gagal memverifikasi spreadsheet:", error);
    return false;
  }
};

// Create a new Spreadsheet with custom tabs
export const createStoreSpreadsheet = async (
  accessToken: string,
  storeName: string
): Promise<SyncStatus> => {
  try {
    const title = `KASIR-UMKM - Laporan Pendapatan & Stok (${storeName})`;
    
    const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: title,
        },
        sheets: [
          {
            properties: {
              title: "Transaksi Penjualan",
              gridProperties: {
                frozenRowCount: 1,
              }
            },
          },
          {
            properties: {
              title: "Daftar Produk & Stok",
              gridProperties: {
                frozenRowCount: 1,
              }
            },
          },
          {
            properties: {
              title: "Semua Pengeluaran",
              gridProperties: {
                frozenRowCount: 1,
              }
            },
          },
          {
            properties: {
              title: "Cadangan Sistem (Jangan Dihapus)",
              gridProperties: {
                frozenRowCount: 1,
              }
            },
          }
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || "Gagal membuat Google Sheet baru");
    }

    const data = await response.json();
    return {
      success: true,
      message: "Spreadsheet berhasil dibuat!",
      spreadsheetId: data.spreadsheetId,
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    };
  } catch (error: any) {
    console.error("Gagal membuat spreadsheet:", error);
    return {
      success: false,
      message: error.message || "Gagal membuat spreadsheet di Drive Anda."
    };
  }
};

// Create the system sheet tab dynamically if it doesn't exist
const ensureBackupTabExists = async (accessToken: string, spreadsheetId: string) => {
  try {
    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (metadataRes.ok) {
      const info = await metadataRes.json();
      const sheetExists = info.sheets?.some((s: any) => s.properties?.title === "Cadangan Sistem (Jangan Dihapus)");
      if (!sheetExists) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: {
                    title: "Cadangan Sistem (Jangan Dihapus)"
                  }
                }
              }
            ]
          })
        });
      }
    }
  } catch (e) {
    console.warn("Gagal memastikan tab Cadangan Sistem ada:", e);
  }
};

// Sync all data into the linked sheet by clearing old data, then updating with fresh values
export const syncAllDataToGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string,
  products: Product[],
  transactions: Transaction[],
  cashierExpenses: CashierExpense[],
  operationalExpenses: OperationalExpense[],
  rawBackupPayload?: any
): Promise<SyncStatus> => {
  try {
    // Make sure the Backup tab exists in case this is an older spreadsheet
    await ensureBackupTabExists(accessToken, spreadsheetId);

    // 1. Clear old data from our tab ranges
    const clearResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ranges: [
            "Transaksi Penjualan!A1:Z10000",
            "Daftar Produk & Stok!A1:Z5000",
            "Semua Pengeluaran!A1:Z5000",
            "Cadangan Sistem (Jangan Dihapus)!A1:A5"
          ],
        }),
      }
    );

    if (!clearResponse.ok) {
      throw new Error("Gagal membersihkan isi spreadsheet sebelum penulisan data baru.");
    }

    // 2. Format Transaksi values
    const transaksiHeader = [
      "No Invoice",
      "Tanggal & Waktu",
      "Penerimaan Tunai (Rp)",
      "Kembalian (Rp)",
      "Item Terjual",
      "Staff Kasir",
      "Total Belanja (IDR)",
      "Total Untung Bersih (IDR)",
      "Detail Belanja"
    ];

    const transaksiRows = transactions.map((t) => {
      const detailItems = t.items
        .map((item) => `${item.name} (${item.quantity}x @ Rp ${item.price.toLocaleString("id-ID")})`)
        .join("; ");
      
      const qtySum = t.items.reduce((sum, item) => sum + item.quantity, 0);

      return [
        t.invoiceNumber,
        new Date(t.date).toLocaleString("id-ID"),
        t.cashPaid || t.total,
        t.cashReturn || 0,
        qtySum,
        t.cashierName || "Sistem Kasir",
        t.total,
        t.profit,
        detailItems
      ];
    });

    const transaksiSheetData = [transaksiHeader, ...transaksiRows];

    // 3. Format Produk values
    const produkHeader = [
      "ID Produk",
      "SKU / Barcode",
      "Nama Produk/Barang",
      "Kategori",
      "Harga Modal (IDR)",
      "Harga Jual (IDR)",
      "Margin Untung (IDR)",
      "Stok Saat Ini",
      "Alert Minimum Stok",
      "Status Stok"
    ];

    const produkRows = products.map((p) => {
      const margin = p.price - p.cost;
      const status = p.stock === 0 ? "Habis" : p.stock <= p.minStock ? "Menipis" : "Cukup";
      return [
        p.id,
        p.sku || "-",
        p.name,
        p.category,
        p.cost,
        p.price,
        margin,
        p.stock,
        p.minStock,
        status
      ];
    });

    const produkSheetData = [produkHeader, ...produkRows];

    // 4. Format Pengeluaran values
    const pengeluaranHeader = [
      "ID Pengeluaran",
      "Tanggal & Waktu",
      "Jenis Pengeluaran",
      "Kategori",
      "Deskripsi/Keterangan",
      "Total Nominal (IDR)",
      "Dicatat Oleh"
    ];

    const cashierExpenseRows = cashierExpenses.map((e) => [
      e.id,
      new Date(e.date).toLocaleString("id-ID"),
      "KASIR (SHIFT)",
      "Kasir",
      e.description,
      e.amount,
      e.recordedBy || "Staff Kasir"
    ]);

    const operationalExpenseRows = operationalExpenses.map((e) => [
      e.id,
      new Date(e.date).toLocaleString("id-ID"),
      "OPERASIONAL (TOKO)",
      e.category,
      e.description,
      e.amount,
      "Owner / Admin"
    ]);

    // Combines both expenses and sorts by date descending
    const allExpensesRows = [...cashierExpenseRows, ...operationalExpenseRows].sort(
      (a, b) => new Date(b[1] as string).getTime() - new Date(a[1] as string).getTime()
    );

    const pengeluaranSheetData = [pengeluaranHeader, ...allExpensesRows];

    // 5. Build Batch Update request to update sheets simultaneously
    const sheetsData: any[] = [
      {
        range: "Transaksi Penjualan!A1",
        values: transaksiSheetData,
      },
      {
        range: "Daftar Produk & Stok!A1",
        values: produkSheetData,
      },
      {
        range: "Semua Pengeluaran!A1",
        values: pengeluaranSheetData,
      }
    ];

    if (rawBackupPayload) {
      sheetsData.push({
        range: "Cadangan Sistem (Jangan Dihapus)!A1",
        values: [[JSON.stringify(rawBackupPayload)]],
      });
    }

    const syncResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: sheetsData,
        }),
      }
    );

    if (!syncResponse.ok) {
      const errData = await syncResponse.json().catch(() => ({}));
      throw new Error(errData?.error?.message || "Gagal memperbarui sheet data.");
    }

    return {
      success: true,
      message: `Sinkronisasi selesai! Berhasil menyisipkan ${transactions.length} transaksi, ${products.length} produk, dan ${allExpensesRows.length} catatan biaya ke Google Sheets.`
    };
  } catch (error: any) {
    console.error("Gagal melakukan sinkronisasi Google Sheets:", error);
    return {
      success: false,
      message: error.message || "Gagal menyinkronkan data ke Google Sheets."
    };
  }
};

// Download latest system backup from Google Sheets
export const fetchBackupFromGoogleSheets = async (
  accessToken: string,
  spreadsheetId: string
): Promise<any> => {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cadangan%20Sistem%20(Jangan%20Dihapus)!A1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || "Gagal mengunduh berkas cadangan dari Google Sheets.");
  }

  const data = await response.json();
  if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
    throw new Error("Kolom cadangan kosong di Google Sheets atau belum pernah disinkronkan.");
  }

  try {
    const parsed = JSON.parse(data.values[0][0]);
    return parsed;
  } catch (e: any) {
    throw new Error("Gagal mengurai file cadangan dari Google Sheets: " + e.message);
  }
};

