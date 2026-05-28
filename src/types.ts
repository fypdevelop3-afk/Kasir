/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number; // Harga Jual
  cost: number;  // Harga Beli/Pokok
  stock: number; // Jumlah stok real-time
  minStock: number; // Minimal stok untuk alert
  category: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: "in" | "out" | "adj"; // in: pemasukan, out: pengeluaran, adj: penyesuaian
  quantity: number; // kuantitas perubahan
  previousStock: number;
  newStock: number;
  date: string; // ISO String
  notes?: string;
  referenceId?: string; // misal invoice number untuk out
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // ISO String
  items: TransactionItem[];
  total: number;
  costTotal: number; // Modal penjualan
  profit: number; // total - costTotal
  cashPaid: number;
  cashReturn: number;
  cashierName: string;
  notes?: string;
  paymentMethod: "tunai" | "non-tunai"; // tunai atau non-tunai (QRIS / Bank)
  shiftId?: string; // Menghubungkan transaksi dengan shift kasir tertentu
}

export interface CashierExpense {
  id: string;
  date: string; // ISO String
  category: string; // misal: "Parkir", "Refund", "Kembalian", "Lainnya"
  description: string;
  amount: number;
  recordedBy: string;
  shiftId?: string; // Menghubungkan pengeluaran kasir dengan shift tertentu
}

export interface OperationalExpense {
  id: string;
  date: string; // ISO String
  category: string; // misal: "Sewa Tempat", "Gaji", "Listrik & Air", "Internet", "Lainnya"
  description: string;
  amount: number;
}

export interface Investor {
  id: string;
  name: string;
  sharePercentage: number; // Persentase bagi hasil (e.g., 25 untuk 25%)
  amountInvested: number;  // Jumlah investasi awal (Rp)
  contact: string;
  joinedDate: string;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  greetingMessage: string;
  ownerPin?: string; // Optional Owner PIN of 4 digits to restrict Admin access (default is "1234")
  ownerWhatsapp?: string; // Optional Owner WhatsApp number to send shift summary reports
}

export interface CashierShift {
  id: string;
  cashierName: string;
  startTime: string; // ISO String
  endTime?: string;  // ISO String
  startBalance: number; // Modal awal (kas kecil laci)
  cashSales: number; // total penjualan tunai
  nonCashSales: number; // total penjualan non-tunai (QRIS / Bank)
  cashExpenses: number; // total pengeluaran kecil kasir selama shift
  expectedCash: number; // saldo uang kas di laci teoritis: startBalance + cashSales - cashExpenses
  actualDeposit?: number; // jumlah setoran tunai aktual dari kasir
  difference?: number; // selisih kasir: actualDeposit - expectedCash
  notes?: string;
  isClosed: boolean;
}

