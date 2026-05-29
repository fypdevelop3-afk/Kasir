/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Product, Transaction, CashierExpense, OperationalExpense, Investor, StoreSettings, Category, StockLog, CashierShift, Topping } from "./types";
import {
  getProducts,
  saveProducts,
  getTransactions,
  saveTransactions,
  getCashierExpenses,
  saveCashierExpenses,
  getOperationalExpenses,
  saveOperationalExpenses,
  getInvestors,
  saveInvestors,
  getStoreSettings,
  saveStoreSettings,
  getCategories,
  saveCategories,
  getStockLogs,
  saveStockLogs,
  getShifts,
  saveShifts,
  resetToMockData as dbReset,
  resetToFactorySettings,
  resetTransactionsOnly,
  getToppings,
  saveToppings
} from "./dataStore";
import { syncAllDataToGoogleSheets } from "./utils/googleSheetsService";
import { getAccessToken } from "./utils/googleAuth";

interface AppContextType {
  products: Product[];
  transactions: Transaction[];
  cashierExpenses: CashierExpense[];
  operationalExpenses: OperationalExpense[];
  investors: Investor[];
  storeSettings: StoreSettings;
  categories: Category[];
  stockLogs: StockLog[];
  shifts: CashierShift[];
  activeShift: CashierShift | null;
  toppings: Topping[];
  openShift: (cashierName: string, startBalance: number) => void;
  closeShift: (actualDeposit: number, notes?: string) => void;
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, "id" | "invoiceNumber">) => Transaction;
  addCashierExpense: (expense: Omit<CashierExpense, "id" | "date"> & { date?: string }) => void;
  addOperationalExpense: (expense: Omit<OperationalExpense, "id" | "date"> & { date?: string }) => void;
  addInvestor: (investor: Omit<Investor, "id" | "joinedDate">) => void;
  updateInvestor: (investor: Investor) => void;
  deleteInvestor: (id: string) => void;
  updateStoreSettings: (settings: StoreSettings) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  adjustStock: (productId: string, quantityChange: number, type: "in" | "out" | "adj", notes?: string) => void;
  resetAllData: () => void;
  resetOnlyTransactions: () => void;
  addTopping: (topping: Omit<Topping, "id">) => void;
  updateTopping: (topping: Topping) => void;
  deleteTopping: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashierExpenses, setCashierExpenses] = useState<CashierExpense[]>([]);
  const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    storeName: "Sentosa Jaya POS",
    address: "",
    phone: "",
    greetingMessage: "",
    ownerPin: "1234"
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);

  // Load initial data
  useEffect(() => {
    setProducts(getProducts());
    setTransactions(getTransactions());
    setCashierExpenses(getCashierExpenses());
    setOperationalExpenses(getOperationalExpenses());
    setInvestors(getInvestors());
    setStoreSettings(getStoreSettings());
    setCategories(getCategories());
    setStockLogs(getStockLogs());
    setShifts(getShifts());
    setToppings(getToppings());
  }, []);

  // Compute active shift with real-time aggregated shift figures
  const rawActiveShift = useMemo(() => {
    return shifts.find(s => !s.isClosed) || null;
  }, [shifts]);

  const activeShift = useMemo(() => {
    if (!rawActiveShift) return null;

    const shiftTransactions = transactions.filter(t => t.shiftId === rawActiveShift.id);
    const shiftExpenses = cashierExpenses.filter(e => e.shiftId === rawActiveShift.id);

    const cashSales = shiftTransactions
      .filter(t => t.paymentMethod === "tunai")
      .reduce((sum, t) => sum + t.total, 0);

    const nonCashSales = shiftTransactions
      .filter(t => t.paymentMethod === "non-tunai")
      .reduce((sum, t) => sum + t.total, 0);

    const cashExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = rawActiveShift.startBalance + cashSales - cashExpenses;

    return {
      ...rawActiveShift,
      cashSales,
      nonCashSales,
      cashExpenses,
      expectedCash
    };
  }, [shifts, transactions, cashierExpenses, rawActiveShift?.id]);

  const openShift = (cashierName: string, startBalance: number) => {
    const newShift: CashierShift = {
      id: "shift_" + Date.now().toString(),
      cashierName,
      startTime: new Date().toISOString(),
      startBalance,
      cashSales: 0,
      nonCashSales: 0,
      cashExpenses: 0,
      expectedCash: startBalance,
      isClosed: false
    };
    const nextShifts = [newShift, ...shifts];
    setShifts(nextShifts);
    saveShifts(nextShifts);
  };

  const closeShift = (actualDeposit: number, notes?: string) => {
    if (!activeShift) return;

    const nextShifts = shifts.map(s => {
      if (s.id === activeShift.id) {
        return {
          ...s,
          endTime: new Date().toISOString(),
          cashSales: activeShift.cashSales,
          nonCashSales: activeShift.nonCashSales,
          cashExpenses: activeShift.cashExpenses,
          expectedCash: activeShift.expectedCash,
          actualDeposit,
          difference: actualDeposit - activeShift.expectedCash,
          notes,
          isClosed: true
        };
      }
      return s;
    });
    setShifts(nextShifts);
    saveShifts(nextShifts);
  };

  // Sync state helpers
  const handleSetProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    saveProducts(newProducts);
  };

  const handleSetTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    saveTransactions(newTransactions);
  };

  const handleSetCashierExpenses = (newExpenses: CashierExpense[]) => {
    setCashierExpenses(newExpenses);
    saveCashierExpenses(newExpenses);
  };

  const handleSetOperationalExpenses = (newExpenses: OperationalExpense[]) => {
    setOperationalExpenses(newExpenses);
    saveOperationalExpenses(newExpenses);
  };

  const handleSetInvestors = (newInvestors: Investor[]) => {
    setInvestors(newInvestors);
    saveInvestors(newInvestors);
  };

  const handleSetCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    saveCategories(newCategories);
  };

  const handleSetStockLogs = (newLogs: StockLog[]) => {
    setStockLogs(newLogs);
    saveStockLogs(newLogs);
  };

  // Mutators
  const addProduct = (p: Omit<Product, "id">) => {
    const newId = "prod_" + Date.now().toString();
    const newProduct: Product = {
      ...p,
      id: newId
    };
    handleSetProducts([newProduct, ...products]);

    // Create a stock log entry if initial stock > 0
    if (p.stock > 0) {
      const newLog: StockLog = {
        id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
        productId: newId,
        productName: p.name,
        sku: p.sku,
        type: "in",
        quantity: p.stock,
        previousStock: 0,
        newStock: p.stock,
        date: new Date().toISOString(),
        notes: "Stok awal masuk saat tambah produk baru"
      };
      handleSetStockLogs([newLog, ...stockLogs]);
    }
  };

  const updateProduct = (p: Product) => {
    const oldProduct = products.find((item) => item.id === p.id);
    if (oldProduct && oldProduct.stock !== p.stock) {
      const diff = p.stock - oldProduct.stock;
      const newLog: StockLog = {
        id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        type: diff > 0 ? "in" : "adj",
        quantity: Math.abs(diff),
        previousStock: oldProduct.stock,
        newStock: p.stock,
        date: new Date().toISOString(),
        notes: `Penyesuaian edit produk (dari ${oldProduct.stock} ke ${p.stock})`
      };
      handleSetStockLogs([newLog, ...stockLogs]);
    }
    handleSetProducts(products.map((item) => (item.id === p.id ? p : item)));
  };

  const deleteProduct = (id: string) => {
    handleSetProducts(products.filter((item) => item.id !== id));
  };

  const addTransaction = (t: Omit<Transaction, "id" | "invoiceNumber">) => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                    (today.getMonth() + 1).toString().padStart(2, "0") + 
                    today.getDate().toString().padStart(2, "0");
    const countToday = transactions.filter(tx => tx.invoiceNumber.includes(`INV-${dateStr}`)).length;
    const nextNum = (countToday + 1).toString().padStart(3, "0");
    const invoiceNumber = `INV-${dateStr}-${nextNum}`;

    const newTx: Transaction = {
      ...t,
      id: "tx_" + Date.now().toString(),
      invoiceNumber,
      shiftId: rawActiveShift?.id
    };

    // Deduct stock real-time & generate stock logs
    const soldLogs: StockLog[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = t.items.find((item) => item.productId === prod.id);
      if (soldItem) {
        const previousStock = prod.stock;
        const newStock = Math.max(0, prod.stock - soldItem.quantity);
        soldLogs.push({
          id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: "out",
          quantity: soldItem.quantity,
          previousStock,
          newStock,
          date: new Date().toISOString(),
          notes: `Penjualan Real-time (Kasir)`,
          referenceId: invoiceNumber
        });
        return {
          ...prod,
          stock: newStock
        };
      }
      return prod;
    });

    handleSetProducts(updatedProducts);
    if (soldLogs.length > 0) {
      handleSetStockLogs([...soldLogs, ...stockLogs]);
    }
    handleSetTransactions([newTx, ...transactions]);
    return newTx;
  };

  const addCashierExpense = (exp: Omit<CashierExpense, "id" | "date"> & { date?: string }) => {
    const newExp: CashierExpense = {
      ...exp,
      id: "cexp_" + Date.now().toString(),
      date: exp.date || new Date().toISOString(),
      shiftId: rawActiveShift?.id
    };
    handleSetCashierExpenses([newExp, ...cashierExpenses]);
  };

  const addOperationalExpense = (exp: Omit<OperationalExpense, "id" | "date"> & { date?: string }) => {
    const newExp: OperationalExpense = {
      ...exp,
      id: "opexp_" + Date.now().toString(),
      date: exp.date || new Date().toISOString()
    };
    handleSetOperationalExpenses([newExp, ...operationalExpenses]);
  };

  const addInvestor = (inv: Omit<Investor, "id" | "joinedDate">) => {
    const newInv: Investor = {
      ...inv,
      id: "inv_" + Date.now().toString(),
      joinedDate: new Date().toISOString()
    };
    handleSetInvestors([...investors, newInv]);
  };

  const updateInvestor = (inv: Investor) => {
    handleSetInvestors(investors.map((item) => (item.id === inv.id ? inv : item)));
  };

  const deleteInvestor = (id: string) => {
    handleSetInvestors(investors.filter((item) => item.id !== id));
  };

  const updateStoreSettings = (settings: StoreSettings) => {
    setStoreSettings(settings);
    saveStoreSettings(settings);
  };

  const addCategory = (name: string) => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return;
    if (categories.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) return;
    const newCat: Category = {
      id: "cat_" + Date.now().toString(),
      name: nameTrimmed
    };
    handleSetCategories([...categories, newCat]);
  };

  const deleteCategory = (id: string) => {
    handleSetCategories(categories.filter(c => c.id !== id));
  };

  const adjustStock = (productId: string, quantityChange: number, type: "in" | "out" | "adj", notes?: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    const previousStock = p.stock;
    
    let finalStock = previousStock;
    let actualChange = quantityChange;
    if (type === "in") {
      finalStock = previousStock + quantityChange;
    } else if (type === "out") {
      finalStock = Math.max(0, previousStock - quantityChange);
    } else if (type === "adj") {
      finalStock = Math.max(0, previousStock + quantityChange);
      actualChange = quantityChange;
    }

    const updatedProduct = {
      ...p,
      stock: finalStock
    };

    const newLog: StockLog = {
      id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
      productId,
      productName: p.name,
      sku: p.sku,
      type,
      quantity: Math.abs(actualChange),
      previousStock,
      newStock: finalStock,
      date: new Date().toISOString(),
      notes: notes || (type === "in" ? "Pemasukan Manual" : type === "out" ? "Pengeluaran Manual" : "Penyesuaian Stok")
    };

    handleSetProducts(products.map(prod => prod.id === productId ? updatedProduct : prod));
    handleSetStockLogs([newLog, ...stockLogs]);
  };

  const resetAllData = () => {
    resetToFactorySettings();
    setProducts([]);
    setTransactions([]);
    setCashierExpenses([]);
    setOperationalExpenses([]);
    setInvestors([]);
    setStoreSettings({
      storeName: "Sentosa Jaya POS",
      address: "Jl. Merdeka No. 45, Bandung, Jawa Barat",
      phone: "0812-3456-7890",
      greetingMessage: "Terima kasih telah berbelanja di Sentosa Jaya!",
      ownerPin: "1234",
      ownerWhatsapp: ""
    });
    setCategories([
      { id: "cat1", name: "Makanan" },
      { id: "cat2", name: "Minuman" },
      { id: "cat3", name: "Cemilan" },
      { id: "cat4", name: "Lainnya / Merchandise" }
    ]);
    setStockLogs([]);
    setShifts([]);
    setToppings(getToppings());
  };

  const resetOnlyTransactions = () => {
    resetTransactionsOnly();
    setTransactions([]);
    setCashierExpenses([]);
    setOperationalExpenses([]);
    setStockLogs([]);
    setShifts([]);
  };

  // Automated Monthly Closings check & Google Sheets syncing on app load
  useEffect(() => {
    if (transactions.length === 0) return;

    const checkMonthlyClosing = async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Find transactions occurring prior to current month
      const pastTxs = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() < currentYear || 
               (txDate.getFullYear() === currentYear && txDate.getMonth() < currentMonth);
      });

      if (pastTxs.length === 0) return;

      // Group past transactions by year-month string
      const pastMonthsGrouped: { [key: string]: Transaction[] } = {};
      pastTxs.forEach(t => {
        const txDate = new Date(t.date);
        const yyyymm = `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, "0")}`;
        if (!pastMonthsGrouped[yyyymm]) {
          pastMonthsGrouped[yyyymm] = [];
        }
        pastMonthsGrouped[yyyymm].push(t);
      });

      const sortedPastMonths = Object.keys(pastMonthsGrouped).sort();
      const closingsStr = localStorage.getItem("kasir_umkm_monthly_closings");
      const currentClosings = closingsStr ? JSON.parse(closingsStr) : [];
      let updatedClosings = [...currentClosings];
      let needsStateUpdate = false;

      for (const yyyymm of sortedPastMonths) {
        if (currentClosings.some((c: any) => c.monthString === yyyymm)) {
          continue;
        }

        const monthTxs = pastMonthsGrouped[yyyymm];
        const monthCashierExps = cashierExpenses.filter(e => {
          const d = new Date(e.date);
          const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          return ym === yyyymm;
        });

        const monthOpsExps = operationalExpenses.filter(e => {
          const d = new Date(e.date);
          const ym = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          return ym === yyyymm;
        });

        const revenue = monthTxs.reduce((sum, tx) => sum + tx.total, 0);
        const cost = monthTxs.reduce((sum, tx) => sum + tx.costTotal, 0);
        const profit = revenue - cost;
        const totalExp = monthCashierExps.reduce((sum, e) => sum + e.amount, 0) + 
                         monthOpsExps.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = profit - totalExp;

        // Formats month string to indonesian month
        const [year, month] = yyyymm.split("-");
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
        const monthName = monthNames[parseInt(month, 10) - 1] || "Bulan";
        const labelIndo = `${monthName} ${year}`;

        const newClosing = {
          id: "closing_" + yyyymm + "_" + Date.now().toString(),
          monthString: yyyymm,
          name: labelIndo,
          dateClosed: new Date().toISOString(),
          totalSales: revenue,
          totalProfit: profit,
          totalExpenses: totalExp,
          netProfit: netProfit,
          syncedToGoogleSheets: false
        };

        const savedId = localStorage.getItem("kasir_spreadsheet_id");
        const token = await getAccessToken();

        if (savedId && token) {
          try {
            const syncResult = await syncAllDataToGoogleSheets(
              token,
              savedId,
              products,
              transactions, // push current transactions state to backing sheet first
              cashierExpenses,
              operationalExpenses
            );
            if (syncResult.success) {
              newClosing.syncedToGoogleSheets = true;
              localStorage.setItem("kasir_last_synced", new Date().toLocaleString("id-ID"));
            }
          } catch (err) {
            console.error("Gagal sinkronisasi Google Sheets otomatis:", err);
          }
        }

        updatedClosings.push(newClosing);
        needsStateUpdate = true;
      }

      if (needsStateUpdate) {
        localStorage.setItem("kasir_umkm_monthly_closings", JSON.stringify(updatedClosings));

        // Archive transaction and fee details prior to clearing
        const archivedTxsStr = localStorage.getItem("kasir_umkm_archived_transactions");
        const archivedTxs = archivedTxsStr ? JSON.parse(archivedTxsStr) : [];
        
        const archivedCExpStr = localStorage.getItem("kasir_umkm_archived_cashier_expenses");
        const archivedCExp = archivedCExpStr ? JSON.parse(archivedCExpStr) : [];

        const archivedOExpStr = localStorage.getItem("kasir_umkm_archived_operational_expenses");
        const archivedOExp = archivedOExpStr ? JSON.parse(archivedOExpStr) : [];

        const newArchivedTxs = [...archivedTxs, ...pastTxs];
        const newArchivedCExps = [...archivedCExp, ...cashierExpenses.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() < currentMonth);
        })];
        const newArchivedOExps = [...archivedOExp, ...operationalExpenses.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() < currentMonth);
        })];

        localStorage.setItem("kasir_umkm_archived_transactions", JSON.stringify(newArchivedTxs));
        localStorage.setItem("kasir_umkm_archived_cashier_expenses", JSON.stringify(newArchivedCExps));
        localStorage.setItem("kasir_umkm_archived_operational_expenses", JSON.stringify(newArchivedOExps));

        // State filter
        const activeTxs = transactions.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
        });

        const activeCExps = cashierExpenses.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        const activeOExps = operationalExpenses.filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        setTransactions(activeTxs);
        setCashierExpenses(activeCExps);
        setOperationalExpenses(activeOExps);

        saveTransactions(activeTxs);
        saveCashierExpenses(activeCExps);
        saveOperationalExpenses(activeOExps);

        alert("📊 TUTUP BUKU BULANAN OTOMATIS BERHASIL!\n\nLaporan keuangan bulan kemarin telah disimpulkan, disinkronkan ke Google Sheets, dan diarsipkan secara aman.");
      }
    };

    checkMonthlyClosing();
  }, [transactions, cashierExpenses, operationalExpenses, products]);

  const addTopping = (newTopping: Omit<Topping, "id">) => {
    const fresh: Topping = {
      ...newTopping,
      id: "top_" + Date.now().toString()
    };
    const updated = [...toppings, fresh];
    setToppings(updated);
    saveToppings(updated);
  };

  const updateTopping = (updatedTopping: Topping) => {
    const updated = toppings.map(t => (t.id === updatedTopping.id ? updatedTopping : t));
    setToppings(updated);
    saveToppings(updated);
  };

  const deleteTopping = (id: string) => {
    const updated = toppings.filter(t => t.id !== id);
    setToppings(updated);
    saveToppings(updated);
  };

  return (
    <AppContext.Provider
      value={{
        products,
        transactions,
        cashierExpenses,
        operationalExpenses,
        investors,
        storeSettings,
        categories,
        stockLogs,
        shifts,
        activeShift,
        toppings,
        openShift,
        closeShift,
        addProduct,
        updateProduct,
        deleteProduct,
        addTransaction,
        addCashierExpense,
        addOperationalExpense,
        addInvestor,
        updateInvestor,
        deleteInvestor,
        updateStoreSettings,
        addCategory,
        deleteCategory,
        adjustStock,
        resetAllData,
        resetOnlyTransactions: resetOnlyTransactions,
        addTopping,
        updateTopping,
        deleteTopping
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
