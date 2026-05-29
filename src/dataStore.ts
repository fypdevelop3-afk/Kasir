/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Transaction, CashierExpense, OperationalExpense, Investor, StoreSettings, Category, StockLog, CashierShift, Topping, Discount } from "./types";

// Helper keys
const PRODUCTS_KEY = "kasir_umkm_products";
const TRANSACTIONS_KEY = "kasir_umkm_transactions";
const CASHIER_EXP_KEY = "kasir_umkm_cashier_expenses";
const OPERATIONAL_EXP_KEY = "kasir_umkm_operational_expenses";
const INVESTORS_KEY = "kasir_umkm_investors";
const SETTINGS_KEY = "kasir_umkm_settings";
const CATEGORIES_KEY = "kasir_umkm_categories";
const STOCK_LOGS_KEY = "kasir_umkm_stock_logs";
const SHIFTS_KEY = "kasir_umkm_shifts";
const TOPPINGS_KEY = "kasir_umkm_toppings";
const DISCOUNTS_KEY = "kasir_umkm_discounts";

export const MOCK_TOPPINGS: Topping[] = [
  { id: "top1", name: "Cokelat Parut", price: 3000 },
  { id: "top2", name: "Keju Kraft", price: 4000 },
  { id: "top3", name: "Boba / Tapioca Pearl", price: 5000 },
  { id: "top4", name: "Whipped Cream", price: 4000 },
  { id: "top5", name: "Susu Kental Manis Extra", price: 2000 }
];

export const MOCK_DISCOUNTS: Discount[] = [
  { id: "disc1", name: "Diskon Jumat Berkah (10%)", type: "percentage", value: 10 },
  { id: "disc2", name: "Diskon Karyawan (15%)", type: "percentage", value: 15 },
  { id: "disc3", name: "Potongan Langsung (Rp 5.000)", type: "nominal", value: 5000 },
  { id: "disc4", name: "Potongan Pembeli Setia (Rp 10.000)", type: "nominal", value: 10000 }
];

// Default Store Settings
const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Sentosa Jaya POS",
  address: "Jl. Merdeka No. 45, Bandung, Jawa Barat",
  phone: "0812-3456-7890",
  greetingMessage: "Terima kasih telah berbelanja di Sentosa Jaya!",
  ownerPin: "1234",
  ownerWhatsapp: "",
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat1", name: "Makanan" },
  { id: "cat2", name: "Minuman" },
  { id: "cat3", name: "Cemilan" },
  { id: "cat4", name: "Lainnya / Merchandise" }
];

// Initial state generators
export const MOCK_PRODUCTS: Product[] = [
  { id: "p1", sku: "SKU-KP01", name: "Kopi Susu Gula Aren", price: 18000, cost: 8000, stock: 45, minStock: 10, category: "Minuman" },
  { id: "p2", sku: "SKU-KP02", name: "Es Teh Manis Jumbo", price: 6000, cost: 1500, stock: 120, minStock: 15, category: "Minuman" },
  { id: "p3", sku: "SKU-MK01", name: "Roti Bakar Cokelat Keju", price: 15000, cost: 6000, stock: 30, minStock: 5, category: "Makanan" },
  { id: "p4", sku: "SKU-MK02", name: "Kentang Goreng Crispy", price: 14000, cost: 7000, stock: 25, minStock: 8, category: "Makanan" },
  { id: "p5", sku: "SKU-MK03", name: "Indomie Goreng Double", price: 12000, cost: 4000, stock: 50, minStock: 10, category: "Makanan" },
  { id: "p6", sku: "SKU-KP03", name: "Susu Strawberry Fresh", price: 16000, cost: 7500, stock: 8, minStock: 10, category: "Minuman" }, // low stock
  { id: "p7", sku: "SKU-SN01", name: "Keripik Singkong Balado", price: 8000, cost: 3500, stock: 3, minStock: 5, category: "Cemilan" }, // low stock
  { id: "p8", sku: "SKU-SN02", name: "Kacang Mete Asin", price: 10000, cost: 5000, stock: 20, minStock: 5, category: "Cemilan" },
];

// Helper to get dates relative to today
const getPastDateStr = (daysAgo: number, hour: number = 10, minute: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const MOCK_STOCK_LOGS = (): StockLog[] => [
  { id: "log_init_1", productId: "p1", productName: "Kopi Susu Gula Aren", sku: "SKU-KP01", type: "in", quantity: 50, previousStock: 0, newStock: 50, date: getPastDateStr(3), notes: "Stok awal masuk gudang" },
  { id: "log_init_2", productId: "p1", productName: "Kopi Susu Gula Aren", sku: "SKU-KP01", type: "out", quantity: 2, previousStock: 50, newStock: 48, date: getPastDateStr(1), notes: "Penjualan Real-time (Kasir) - Invoice INV-20260527-001", referenceId: "INV-20260527-001" },
  { id: "log_init_3", productId: "p1", productName: "Kopi Susu Gula Aren", sku: "SKU-KP01", type: "out", quantity: 3, previousStock: 48, newStock: 45, date: getPastDateStr(1), notes: "Penjualan Real-time (Kasir) - Invoice INV-20260527-003", referenceId: "INV-20260527-003" },
  { id: "log_init_4", productId: "p2", productName: "Es Teh Manis Jumbo", sku: "SKU-KP02", type: "in", quantity: 125, previousStock: 0, newStock: 125, date: getPastDateStr(3), notes: "Restock grosir teh" },
  { id: "log_init_5", productId: "p2", productName: "Es Teh Manis Jumbo", sku: "SKU-KP02", type: "out", quantity: 5, previousStock: 125, newStock: 120, date: getPastDateStr(1), notes: "Penjualan Real-time (Kasir) - Invoice INV-20260527-002", referenceId: "INV-20260527-002" },
  { id: "log_init_6", productId: "p6", productName: "Susu Strawberry Fresh", sku: "SKU-KP03", type: "in", quantity: 8, previousStock: 0, newStock: 8, date: getPastDateStr(4), notes: "Beli stok mandiri" },
  { id: "log_init_7", productId: "p7", productName: "Keripik Singkong Balado", sku: "SKU-SN01", type: "in", quantity: 5, previousStock: 0, newStock: 5, date: getPastDateStr(2), notes: "Beli stok keripik" },
  { id: "log_init_8", productId: "p7", productName: "Keripik Singkong Balado", sku: "SKU-SN01", type: "out", quantity: 2, previousStock: 5, newStock: 3, date: getPastDateStr(1), notes: "Penjualan Real-time (Kasir) - Invoice INV-20260527-003", referenceId: "INV-20260527-003" }
];

export const MOCK_TRANSACTIONS = (): Transaction[] => [
  {
    id: "tx1",
    invoiceNumber: "INV-20260527-001",
    date: getPastDateStr(1, 10, 15),
    items: [
      { productId: "p1", name: "Kopi Susu Gula Aren", quantity: 2, price: 18000, cost: 8000, subtotal: 36000 },
      { productId: "p3", name: "Roti Bakar Cokelat Keju", quantity: 1, price: 15000, cost: 6000, subtotal: 15000 },
    ],
    total: 51000,
    costTotal: 22000,
    profit: 29000,
    cashPaid: 60000,
    cashReturn: 9000,
    cashierName: "Budi",
    paymentMethod: "tunai",
  },
  {
    id: "tx2",
    invoiceNumber: "INV-20260527-002",
    date: getPastDateStr(1, 14, 30),
    items: [
      { productId: "p2", name: "Es Teh Manis Jumbo", quantity: 5, price: 6000, cost: 1500, subtotal: 30000 },
      { productId: "p4", name: "Kentang Goreng Crispy", quantity: 2, price: 14000, cost: 7000, subtotal: 28000 },
    ],
    total: 58000,
    costTotal: 21500,
    profit: 36500,
    cashPaid: 100000,
    cashReturn: 42000,
    cashierName: "Budi",
    paymentMethod: "tunai",
  },
  {
    id: "tx3",
    invoiceNumber: "INV-20260527-003",
    date: getPastDateStr(1, 18, 45),
    items: [
      { productId: "p1", name: "Kopi Susu Gula Aren", quantity: 3, price: 18000, cost: 8000, subtotal: 54000 },
      { productId: "p5", name: "Indomie Goreng Double", quantity: 1, price: 12000, cost: 4000, subtotal: 12000 },
      { productId: "p7", name: "Keripik Singkong Balado", quantity: 2, price: 8000, cost: 3500, subtotal: 16000 },
    ],
    total: 82000,
    costTotal: 35000,
    profit: 47000,
    cashPaid: 100000,
    cashReturn: 18000,
    cashierName: "Siti",
    paymentMethod: "tunai",
  },
  // Today's transactions
  {
    id: "tx4",
    invoiceNumber: "INV-20260528-001",
    date: getPastDateStr(0, 8, 30),
    items: [
      { productId: "p1", name: "Kopi Susu Gula Aren", quantity: 1, price: 18000, cost: 8000, subtotal: 18000 },
      { productId: "p2", name: "Es Teh Manis Jumbo", quantity: 1, price: 6000, cost: 1500, subtotal: 6000 },
    ],
    total: 24000,
    costTotal: 9500,
    profit: 14500,
    cashPaid: 30000,
    cashReturn: 6000,
    cashierName: "Budi",
    paymentMethod: "tunai",
  },
  {
    id: "tx5",
    invoiceNumber: "INV-20260528-002",
    date: getPastDateStr(0, 11, 45),
    items: [
      { productId: "p3", name: "Roti Bakar Cokelat Keju", quantity: 2, price: 15000, cost: 6000, subtotal: 30000 },
      { productId: "p5", name: "Indomie Goreng Double", quantity: 2, price: 12000, cost: 4000, subtotal: 24000 },
    ],
    total: 54000,
    costTotal: 20000,
    profit: 34000,
    cashPaid: 100000,
    cashReturn: 46000,
    cashierName: "Budi",
    paymentMethod: "tunai",
  },
  {
    id: "tx6",
    invoiceNumber: "INV-20260528-003",
    date: getPastDateStr(0, 13, 20),
    items: [
      { productId: "p1", name: "Kopi Susu Gula Aren", quantity: 4, price: 18000, cost: 8000, subtotal: 72000 },
      { productId: "p2", name: "Es Teh Manis Jumbo", quantity: 2, price: 6000, cost: 1500, subtotal: 12000 },
      { productId: "p4", name: "Kentang Goreng Crispy", quantity: 1, price: 14000, cost: 7000, subtotal: 14000 },
      { productId: "p8", name: "Kacang Mete Asin", quantity: 3, price: 10000, cost: 5000, subtotal: 30000 },
    ],
    total: 128000,
    costTotal: 57000,
    profit: 71000,
    cashPaid: 130000,
    cashReturn: 2000,
    cashierName: "Siti",
    paymentMethod: "tunai",
  }
];

export const MOCK_CASHIER_EXPENSES = (): CashierExpense[] => [
  {
    id: "exp_c1",
    date: getPastDateStr(1, 11, 0),
    category: "Refund",
    description: "Pengembalian dana es teh tumpah",
    amount: 6000,
    recordedBy: "Budi",
  },
  {
    id: "exp_c2",
    date: getPastDateStr(0, 9, 30),
    category: "Parkir",
    description: "Tips kurir pengantar gas LPG",
    amount: 5000,
    recordedBy: "Budi",
  },
  {
    id: "exp_c3",
    date: getPastDateStr(0, 14, 0),
    category: "Lainnya",
    description: "Beli Air Minum Galon untuk toko",
    amount: 20000,
    recordedBy: "Siti",
  }
];

export const MOCK_OPERATIONAL_EXPENSES = (): OperationalExpense[] => [
  {
    id: "exp_o1",
    date: getPastDateStr(2, 9, 0),
    category: "Listrik & Air",
    description: "Token listrik mingguan toko",
    amount: 150000,
  },
  {
    id: "exp_o2",
    date: getPastDateStr(0, 10, 0),
    category: "Internet",
    description: "Kuota Wifi Indihome Bulanan",
    amount: 220000,
  }
];

export const MOCK_INVESTORS: Investor[] = [
  {
    id: "inv1",
    name: "Pak H. Ridwan",
    sharePercentage: 15,
    amountInvested: 5000000,
    contact: "0812-9988-7711",
    joinedDate: "2026-01-10T08:00:00.000Z",
  },
  {
    id: "inv2",
    name: "Ibu Amanda",
    sharePercentage: 10,
    amountInvested: 3500000,
    contact: "0811-2233-4455",
    joinedDate: "2026-02-15T08:00:00.000Z",
  }
];

// DATA ACCESS LAYERS
export const getProducts = (): Product[] => {
  const data = localStorage.getItem(PRODUCTS_KEY);
  if (!data) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(MOCK_PRODUCTS));
    return MOCK_PRODUCTS;
  }
  return JSON.parse(data);
};

export const saveProducts = (products: Product[]): void => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  if (!data) {
    const mock = MOCK_TRANSACTIONS();
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(mock));
    return mock;
  }
  return JSON.parse(data);
};

export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

export const getCashierExpenses = (): CashierExpense[] => {
  const data = localStorage.getItem(CASHIER_EXP_KEY);
  if (!data) {
    const mock = MOCK_CASHIER_EXPENSES();
    localStorage.setItem(CASHIER_EXP_KEY, JSON.stringify(mock));
    return mock;
  }
  return JSON.parse(data);
};

export const saveCashierExpenses = (expenses: CashierExpense[]): void => {
  localStorage.setItem(CASHIER_EXP_KEY, JSON.stringify(expenses));
};

export const getOperationalExpenses = (): OperationalExpense[] => {
  const data = localStorage.getItem(OPERATIONAL_EXP_KEY);
  if (!data) {
    const mock = MOCK_OPERATIONAL_EXPENSES();
    localStorage.setItem(OPERATIONAL_EXP_KEY, JSON.stringify(mock));
    return mock;
  }
  return JSON.parse(data);
};

export const saveOperationalExpenses = (expenses: OperationalExpense[]): void => {
  localStorage.setItem(OPERATIONAL_EXP_KEY, JSON.stringify(expenses));
};

export const getInvestors = (): Investor[] => {
  const data = localStorage.getItem(INVESTORS_KEY);
  if (!data) {
    localStorage.setItem(INVESTORS_KEY, JSON.stringify(MOCK_INVESTORS));
    return MOCK_INVESTORS;
  }
  return JSON.parse(data);
};

export const saveInvestors = (investors: Investor[]): void => {
  localStorage.setItem(INVESTORS_KEY, JSON.stringify(investors));
};

export const getStoreSettings = (): StoreSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return JSON.parse(data);
};

export const saveStoreSettings = (settings: StoreSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getCategories = (): Category[] => {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (!data) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(data);
};

export const saveCategories = (categories: Category[]): void => {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const getStockLogs = (): StockLog[] => {
  const data = localStorage.getItem(STOCK_LOGS_KEY);
  if (!data) {
    const mock = MOCK_STOCK_LOGS();
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(mock));
    return mock;
  }
  return JSON.parse(data);
};

export const saveStockLogs = (logs: StockLog[]): void => {
  localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(logs));
};

export const getShifts = (): CashierShift[] => {
  const data = localStorage.getItem(SHIFTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveShifts = (shifts: CashierShift[]): void => {
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
};

export const getToppings = (): Topping[] => {
  const data = localStorage.getItem(TOPPINGS_KEY);
  if (!data) {
    localStorage.setItem(TOPPINGS_KEY, JSON.stringify(MOCK_TOPPINGS));
    return MOCK_TOPPINGS;
  }
  return JSON.parse(data);
};

export const saveToppings = (toppings: Topping[]): void => {
  localStorage.setItem(TOPPINGS_KEY, JSON.stringify(toppings));
};

export const getDiscounts = (): Discount[] => {
  const data = localStorage.getItem(DISCOUNTS_KEY);
  if (!data) {
    localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(MOCK_DISCOUNTS));
    return MOCK_DISCOUNTS;
  }
  return JSON.parse(data);
};

export const saveDiscounts = (discounts: Discount[]): void => {
  localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(discounts));
};

export const resetToFactorySettings = (): void => {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
  localStorage.setItem(CASHIER_EXP_KEY, JSON.stringify([]));
  localStorage.setItem(OPERATIONAL_EXP_KEY, JSON.stringify([]));
  localStorage.setItem(INVESTORS_KEY, JSON.stringify([]));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify([]));
  localStorage.setItem(SHIFTS_KEY, JSON.stringify([]));
  localStorage.setItem(TOPPINGS_KEY, JSON.stringify(MOCK_TOPPINGS));
  localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(MOCK_DISCOUNTS));
  localStorage.setItem("kasir_umkm_monthly_closings", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_transactions", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_cashier_expenses", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_operational_expenses", JSON.stringify([]));
};

export const resetTransactionsOnly = (): void => {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
  localStorage.setItem(CASHIER_EXP_KEY, JSON.stringify([]));
  localStorage.setItem(OPERATIONAL_EXP_KEY, JSON.stringify([]));
  localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify([]));
  localStorage.setItem(SHIFTS_KEY, JSON.stringify([]));
  localStorage.setItem("kasir_umkm_monthly_closings", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_transactions", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_cashier_expenses", JSON.stringify([]));
  localStorage.setItem("kasir_umkm_archived_operational_expenses", JSON.stringify([]));
};

export const resetToMockData = (): void => {
  localStorage.removeItem(PRODUCTS_KEY);
  localStorage.removeItem(TRANSACTIONS_KEY);
  localStorage.removeItem(CASHIER_EXP_KEY);
  localStorage.removeItem(OPERATIONAL_EXP_KEY);
  localStorage.removeItem(INVESTORS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(CATEGORIES_KEY);
  localStorage.removeItem(STOCK_LOGS_KEY);
  localStorage.removeItem(SHIFTS_KEY);
  localStorage.removeItem(TOPPINGS_KEY);
  localStorage.removeItem(DISCOUNTS_KEY);
  localStorage.removeItem("kasir_umkm_monthly_closings");
  localStorage.removeItem("kasir_umkm_archived_transactions");
  localStorage.removeItem("kasir_umkm_archived_cashier_expenses");
  localStorage.removeItem("kasir_umkm_archived_operational_expenses");
  // reloading will repopulate via getters
};
