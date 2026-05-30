/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { Product, Transaction, CashierExpense, OperationalExpense, Investor, StoreSettings, Category, StockLog, CashierShift, Topping, Discount } from "./types";
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
  saveToppings,
  getDiscounts,
  saveDiscounts
} from "./dataStore";
import { syncAllDataToGoogleSheets } from "./utils/googleSheetsService";
import { getAccessToken } from "./utils/googleAuth";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs } from "firebase/firestore";

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
  discounts: Discount[];
  storeCode: string | null;
  connectStore: (code: string) => Promise<boolean>;
  generateNewStore: () => Promise<string>;
  disconnectStore: () => void;
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
  addDiscount: (discount: Omit<Discount, "id">) => void;
  updateDiscount: (discount: Discount) => void;
  deleteDiscount: (id: string) => void;
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
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  
  // Real-time Store Synchronisation Code
  const [storeCode, setStoreCode] = useState<string | null>(localStorage.getItem("kasir_store_code") || null);

  // Synchronisation logic & listener setup based on storeCode
  useEffect(() => {
    if (!storeCode) {
      // Local fallback
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
      setDiscounts(getDiscounts());
      return;
    }

    console.log("Connecting real-time Firestore listeners for Store Code:", storeCode);

    const unsubProducts = onSnapshot(collection(db, "stores", storeCode, "products"), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Product);
      });
      setProducts(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/products`));

    const unsubTransactions = onSnapshot(collection(db, "stores", storeCode, "transactions"), (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Transaction);
      });
      setTransactions(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/transactions`));

    const unsubCashierExpenses = onSnapshot(collection(db, "stores", storeCode, "cashierExpenses"), (snapshot) => {
      const list: CashierExpense[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as CashierExpense);
      });
      setCashierExpenses(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/cashierExpenses`));

    const unsubOperationalExpenses = onSnapshot(collection(db, "stores", storeCode, "operationalExpenses"), (snapshot) => {
      const list: OperationalExpense[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as OperationalExpense);
      });
      setOperationalExpenses(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/operationalExpenses`));

    const unsubInvestors = onSnapshot(collection(db, "stores", storeCode, "investors"), (snapshot) => {
      const list: Investor[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Investor);
      });
      setInvestors(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/investors`));

    const unsubCategories = onSnapshot(collection(db, "stores", storeCode, "categories"), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Category);
      });
      setCategories(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/categories`));

    const unsubStockLogs = onSnapshot(collection(db, "stores", storeCode, "stockLogs"), (snapshot) => {
      const list: StockLog[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as StockLog);
      });
      setStockLogs(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/stockLogs`));

    const unsubShifts = onSnapshot(collection(db, "stores", storeCode, "shifts"), (snapshot) => {
      const list: CashierShift[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as CashierShift);
      });
      setShifts(list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/shifts`));

    const unsubToppings = onSnapshot(collection(db, "stores", storeCode, "toppings"), (snapshot) => {
      const list: Topping[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Topping);
      });
      setToppings(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/toppings`));

    const unsubDiscounts = onSnapshot(collection(db, "stores", storeCode, "discounts"), (snapshot) => {
      const list: Discount[] = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id } as Discount);
      });
      setDiscounts(list);
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/discounts`));

    const unsubSettings = onSnapshot(doc(db, "stores", storeCode, "storeSettings", "main"), (docSnap) => {
      if (docSnap.exists()) {
        setStoreSettings(docSnap.data() as StoreSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `stores/${storeCode}/storeSettings/main`));

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubCashierExpenses();
      unsubOperationalExpenses();
      unsubInvestors();
      unsubCategories();
      unsubStockLogs();
      unsubShifts();
      unsubToppings();
      unsubDiscounts();
      unsubSettings();
    };
  }, [storeCode]);

  // Sync methods for connecting and generating Cloud Stores
  const generateNewStoreCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "KSR-";
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const cleanObj = (obj: any) => {
    return JSON.parse(JSON.stringify(obj, (k, v) => (v === undefined ? null : v)));
  };

  const generateNewStore = async (): Promise<string> => {
    const newCode = generateNewStoreCode();
    try {
      // Seed current local memory states into cloud
      await setDoc(doc(db, "stores", newCode, "storeSettings", "main"), cleanObj(storeSettings));

      for (const p of products) {
        await setDoc(doc(db, "stores", newCode, "products", p.id), cleanObj(p));
      }
      for (const cat of categories) {
        await setDoc(doc(db, "stores", newCode, "categories", cat.id), cleanObj(cat));
      }
      for (const t of toppings) {
        await setDoc(doc(db, "stores", newCode, "toppings", t.id), cleanObj(t));
      }
      for (const d of discounts) {
        await setDoc(doc(db, "stores", newCode, "discounts", d.id), cleanObj(d));
      }
      for (const t of transactions) {
        await setDoc(doc(db, "stores", newCode, "transactions", t.id), cleanObj(t));
      }
      for (const s of shifts) {
        await setDoc(doc(db, "stores", newCode, "shifts", s.id), cleanObj(s));
      }
      for (const e of cashierExpenses) {
        await setDoc(doc(db, "stores", newCode, "cashierExpenses", e.id), cleanObj(e));
      }
      for (const e of operationalExpenses) {
        await setDoc(doc(db, "stores", newCode, "operationalExpenses", e.id), cleanObj(e));
      }
      for (const i of investors) {
        await setDoc(doc(db, "stores", newCode, "investors", i.id), cleanObj(i));
      }
      for (const sl of stockLogs) {
        await setDoc(doc(db, "stores", newCode, "stockLogs", sl.id), cleanObj(sl));
      }

      localStorage.setItem("kasir_store_code", newCode);
      setStoreCode(newCode);
      return newCode;
    } catch (err) {
      console.error("Gagal membuat dan migrasi data ke cloud:", err);
      throw err;
    }
  };

  const connectStore = async (code: string): Promise<boolean> => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    try {
      const settingsSnap = await getDoc(doc(db, "stores", trimmed, "storeSettings", "main"));
      if (settingsSnap.exists()) {
        localStorage.setItem("kasir_store_code", trimmed);
        setStoreCode(trimmed);
        return true;
      } else {
        const prodSnap = await getDocs(collection(db, "stores", trimmed, "products"));
        if (!prodSnap.empty) {
          localStorage.setItem("kasir_store_code", trimmed);
          setStoreCode(trimmed);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Gagal menyambung kode sinkronisasi cloud:", err);
      return false;
    }
  };

  const disconnectStore = () => {
    localStorage.removeItem("kasir_store_code");
    setStoreCode(null);
  };

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

  const openShift = async (cashierName: string, startBalance: number) => {
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

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "shifts", newShift.id), newShift);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/shifts/${newShift.id}`);
      }
    } else {
      const nextShifts = [newShift, ...shifts];
      setShifts(nextShifts);
      saveShifts(nextShifts);
    }
  };

  const closeShift = async (actualDeposit: number, notes?: string) => {
    if (!activeShift) return;

    if (storeCode) {
      try {
        const updated = {
          ...activeShift,
          endTime: new Date().toISOString(),
          cashSales: activeShift.cashSales,
          nonCashSales: activeShift.nonCashSales,
          cashExpenses: activeShift.cashExpenses,
          expectedCash: activeShift.expectedCash,
          actualDeposit,
          difference: actualDeposit - activeShift.expectedCash,
          notes: notes || "",
          isClosed: true
        };
        await setDoc(doc(db, "stores", storeCode, "shifts", activeShift.id), updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/shifts/${activeShift.id}`);
      }
    } else {
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
    }
  };

  // Mutators
  const addProduct = async (p: Omit<Product, "id">) => {
    const newId = "prod_" + Date.now().toString();
    const newProduct: Product = { ...p, id: newId };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "products", newId), newProduct);
        if (p.stock > 0) {
          const logId = "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6);
          const newLog: StockLog = {
            id: logId,
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
          await setDoc(doc(db, "stores", storeCode, "stockLogs", logId), newLog);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/products/${newId}`);
      }
    } else {
      const nextProducts = [newProduct, ...products];
      setProducts(nextProducts);
      saveProducts(nextProducts);

      if (p.stock > 0) {
        const newLog: StockLog = {
          id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6),
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
        const nextLogs = [newLog, ...stockLogs];
        setStockLogs(nextLogs);
        saveStockLogs(nextLogs);
      }
    }
  };

  const updateProduct = async (p: Product) => {
    const oldProduct = products.find((item) => item.id === p.id);
    const hasStockChange = oldProduct && oldProduct.stock !== p.stock;

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "products", p.id), p);
        if (hasStockChange && oldProduct) {
          const diff = p.stock - oldProduct.stock;
          const logId = "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6);
          const newLog: StockLog = {
            id: logId,
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
          await setDoc(doc(db, "stores", storeCode, "stockLogs", logId), newLog);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/products/${p.id}`);
      }
    } else {
      if (hasStockChange && oldProduct) {
        const diff = p.stock - oldProduct.stock;
        const newLog: StockLog = {
          id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6),
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
        const nextLogs = [newLog, ...stockLogs];
        setStockLogs(nextLogs);
        saveStockLogs(nextLogs);
      }
      const nextProducts = products.map((item) => (item.id === p.id ? p : item));
      setProducts(nextProducts);
      saveProducts(nextProducts);
    }
  };

  const deleteProduct = async (id: string) => {
    if (storeCode) {
      try {
        await deleteDoc(doc(db, "stores", storeCode, "products", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/products/${id}`);
      }
    } else {
      const nextProducts = products.filter((item) => item.id !== id);
      setProducts(nextProducts);
      saveProducts(nextProducts);
    }
  };

  const addTransaction = (t: Omit<Transaction, "id" | "invoiceNumber">) => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                    (today.getMonth() + 1).toString().padStart(2, "0") + 
                    today.getDate().toString().padStart(2, "0");
    const countToday = transactions.filter(tx => tx.invoiceNumber.includes(`INV-${dateStr}`)).length;
    const nextNum = (countToday + 1).toString().padStart(3, "0");
    const invoiceNumber = `INV-${dateStr}-${nextNum}`;

    const newTxId = "tx_" + Date.now().toString();
    const newTx: Transaction = {
      ...t,
      id: newTxId,
      invoiceNumber,
      shiftId: rawActiveShift?.id || undefined
    };

    // Calculate updated products and logs to preserve stock integrity
    const soldLogs: StockLog[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = t.items.find((item) => item.productId === prod.id);
      if (soldItem) {
        const previousStock = prod.stock;
        const newStock = Math.max(0, prod.stock - soldItem.quantity);
        soldLogs.push({
          id: "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6),
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

    if (storeCode) {
      // Save directly to cloud
      const runCloudTxOperations = async () => {
        try {
          await setDoc(doc(db, "stores", storeCode, "transactions", newTxId), newTx);
          for (const prod of updatedProducts) {
            await setDoc(doc(db, "stores", storeCode, "products", prod.id), prod);
          }
          for (const log of soldLogs) {
            await setDoc(doc(db, "stores", storeCode, "stockLogs", log.id), log);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/transactions/${newTxId}`);
        }
      };
      runCloudTxOperations().catch(() => {});
    } else {
      // Offline local Flow
      setProducts(updatedProducts);
      saveProducts(updatedProducts);
      if (soldLogs.length > 0) {
        setStockLogs([...soldLogs, ...stockLogs]);
        saveStockLogs([...soldLogs, ...stockLogs]);
      }
      const nextTx = [newTx, ...transactions];
      setTransactions(nextTx);
      saveTransactions(nextTx);
    }

    return newTx;
  };

  const addCashierExpense = async (exp: Omit<CashierExpense, "id" | "date"> & { date?: string }) => {
    const newId = "cexp_" + Date.now().toString();
    const newExp: CashierExpense = {
      ...exp,
      id: newId,
      date: exp.date || new Date().toISOString(),
      shiftId: rawActiveShift?.id || undefined
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "cashierExpenses", newId), newExp);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/cashierExpenses/${newId}`);
      }
    } else {
      const nextExps = [newExp, ...cashierExpenses];
      setCashierExpenses(nextExps);
      saveCashierExpenses(nextExps);
    }
  };

  const addOperationalExpense = async (exp: Omit<OperationalExpense, "id" | "date"> & { date?: string }) => {
    const newId = "opexp_" + Date.now().toString();
    const newExp: OperationalExpense = {
      ...exp,
      id: newId,
      date: exp.date || new Date().toISOString()
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "operationalExpenses", newId), newExp);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/operationalExpenses/${newId}`);
      }
    } else {
      const nextExps = [newExp, ...operationalExpenses];
      setOperationalExpenses(nextExps);
      saveOperationalExpenses(nextExps);
    }
  };

  const addInvestor = async (inv: Omit<Investor, "id" | "joinedDate">) => {
    const newId = "inv_" + Date.now().toString();
    const newInv: Investor = {
      ...inv,
      id: newId,
      joinedDate: new Date().toISOString()
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "investors", newId), newInv);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/investors/${newId}`);
      }
    } else {
      const nextInv = [...investors, newInv];
      setInvestors(nextInv);
      saveInvestors(nextInv);
    }
  };

  const updateInvestor = async (inv: Investor) => {
    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "investors", inv.id), inv);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/investors/${inv.id}`);
      }
    } else {
      const nextInv = investors.map((item) => (item.id === inv.id ? inv : item));
      setInvestors(nextInv);
      saveInvestors(nextInv);
    }
  };

  const deleteInvestor = async (id: string) => {
    if (storeCode) {
      try {
        await deleteDoc(doc(db, "stores", storeCode, "investors", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/investors/${id}`);
      }
    } else {
      const nextInv = investors.filter((item) => item.id !== id);
      setInvestors(nextInv);
      saveInvestors(nextInv);
    }
  };

  const updateStoreSettings = async (settings: StoreSettings) => {
    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "storeSettings", "main"), settings);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/storeSettings/main`);
      }
    } else {
      setStoreSettings(settings);
      saveStoreSettings(settings);
    }
  };

  const addCategory = async (name: string) => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return;
    if (categories.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) return;
    
    const newId = "cat_" + Date.now().toString();
    const newCat: Category = {
      id: newId,
      name: nameTrimmed
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "categories", newId), newCat);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/categories/${newId}`);
      }
    } else {
      const nextCats = [...categories, newCat];
      setCategories(nextCats);
      saveCategories(nextCats);
    }
  };

  const deleteCategory = async (id: string) => {
    if (storeCode) {
      try {
        await deleteDoc(doc(db, "stores", storeCode, "categories", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/categories/${id}`);
      }
    } else {
      const nextCats = categories.filter(c => c.id !== id);
      setCategories(nextCats);
      saveCategories(nextCats);
    }
  };

  const adjustStock = async (productId: string, quantityChange: number, type: "in" | "out" | "adj", notes?: string) => {
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

    const logId = "log_" + Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6);
    const newLog: StockLog = {
      id: logId,
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

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "products", productId), updatedProduct);
        await setDoc(doc(db, "stores", storeCode, "stockLogs", logId), newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/products/${productId}`);
      }
    } else {
      const nextProds = products.map(prod => prod.id === productId ? updatedProduct : prod);
      setProducts(nextProds);
      saveProducts(nextProds);

      const nextLogs = [newLog, ...stockLogs];
      setStockLogs(nextLogs);
      saveStockLogs(nextLogs);
    }
  };

  const resetAllData = async () => {
    if (storeCode) {
      // Clear all items on the paired cloud store code
      try {
        for (const p of products) {
          await deleteDoc(doc(db, "stores", storeCode, "products", p.id));
        }
        for (const c of categories) {
          await deleteDoc(doc(db, "stores", storeCode, "categories", c.id));
        }
        for (const t of toppings) {
          await deleteDoc(doc(db, "stores", storeCode, "toppings", t.id));
        }
        for (const d of discounts) {
          await deleteDoc(doc(db, "stores", storeCode, "discounts", d.id));
        }
        for (const t of transactions) {
          await deleteDoc(doc(db, "stores", storeCode, "transactions", t.id));
        }
        for (const e of cashierExpenses) {
          await deleteDoc(doc(db, "stores", storeCode, "cashierExpenses", e.id));
        }
        for (const e of operationalExpenses) {
          await deleteDoc(doc(db, "stores", storeCode, "operationalExpenses", e.id));
        }
        for (const i of investors) {
          await deleteDoc(doc(db, "stores", storeCode, "investors", i.id));
        }
        for (const s of shifts) {
          await deleteDoc(doc(db, "stores", storeCode, "shifts", s.id));
        }
        for (const sl of stockLogs) {
          await deleteDoc(doc(db, "stores", storeCode, "stockLogs", sl.id));
        }
        await setDoc(doc(db, "stores", storeCode, "storeSettings", "main"), {
          storeName: "Sentosa Jaya POS",
          address: "Jl. Merdeka No. 45, Bandung, Jawa Barat",
          phone: "0812-3456-7890",
          greetingMessage: "Terima kasih telah berbelanja di Sentosa Jaya!",
          ownerPin: "1234",
          ownerWhatsapp: ""
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}`);
      }
    } else {
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
      setDiscounts(getDiscounts());
    }
  };

  const resetOnlyTransactions = async () => {
    if (storeCode) {
      try {
        for (const t of transactions) {
          await deleteDoc(doc(db, "stores", storeCode, "transactions", t.id));
        }
        for (const s of shifts) {
          await deleteDoc(doc(db, "stores", storeCode, "shifts", s.id));
        }
        for (const e of cashierExpenses) {
          await deleteDoc(doc(db, "stores", storeCode, "cashierExpenses", e.id));
        }
        for (const e of operationalExpenses) {
          await deleteDoc(doc(db, "stores", storeCode, "operationalExpenses", e.id));
        }
        for (const sl of stockLogs) {
          await deleteDoc(doc(db, "stores", storeCode, "stockLogs", sl.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/transactions`);
      }
    } else {
      resetTransactionsOnly();
      setTransactions([]);
      setCashierExpenses([]);
      setOperationalExpenses([]);
      setStockLogs([]);
      setShifts([]);
    }
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
              transactions, 
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

        if (storeCode) {
          // If synced, let snapshots pull or update as well
          for (const t of pastTxs) {
            await deleteDoc(doc(db, "stores", storeCode, "transactions", t.id));
          }
          // Same for past expenses
          const pastCExps = cashierExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() < currentMonth);
          });
          for (const e of pastCExps) {
            await deleteDoc(doc(db, "stores", storeCode, "cashierExpenses", e.id));
          }
          const pastOExps = operationalExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() < currentYear || (d.getFullYear() === currentYear && d.getMonth() < currentMonth);
          });
          for (const e of pastOExps) {
            await deleteDoc(doc(db, "stores", storeCode, "operationalExpenses", e.id));
          }
        } else {
          setTransactions(activeTxs);
          setCashierExpenses(activeCExps);
          setOperationalExpenses(activeOExps);

          saveTransactions(activeTxs);
          saveCashierExpenses(activeCExps);
          saveOperationalExpenses(activeOExps);
        }

        alert("📊 TUTUP BUKU BULANAN OTOMATIS BERHASIL!\n\nLaporan keuangan bulan kemarin telah disimpulkan, disinkronkan ke Google Sheets, dan diarsipkan secara aman.");
      }
    };

    checkMonthlyClosing();
  }, [transactions, cashierExpenses, operationalExpenses, products, storeCode]);

  const addTopping = async (newTopping: Omit<Topping, "id">) => {
    const newId = "top_" + Date.now().toString();
    const fresh: Topping = {
      ...newTopping,
      id: newId
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "toppings", newId), fresh);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/toppings/${newId}`);
      }
    } else {
      const updated = [...toppings, fresh];
      setToppings(updated);
      saveToppings(updated);
    }
  };

  const updateTopping = async (updatedTopping: Topping) => {
    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "toppings", updatedTopping.id), updatedTopping);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/toppings/${updatedTopping.id}`);
      }
    } else {
      const updated = toppings.map(t => (t.id === updatedTopping.id ? updatedTopping : t));
      setToppings(updated);
      saveToppings(updated);
    }
  };

  const deleteTopping = async (id: string) => {
    if (storeCode) {
      try {
        await deleteDoc(doc(db, "stores", storeCode, "toppings", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/toppings/${id}`);
      }
    } else {
      const updated = toppings.filter(t => t.id !== id);
      setToppings(updated);
      saveToppings(updated);
    }
  };

  const addDiscount = async (newDiscount: Omit<Discount, "id">) => {
    const newId = "disc_" + Date.now().toString();
    const fresh: Discount = {
      ...newDiscount,
      id: newId
    };

    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "discounts", newId), fresh);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/discounts/${newId}`);
      }
    } else {
      const updated = [...discounts, fresh];
      setDiscounts(updated);
      saveDiscounts(updated);
    }
  };

  const updateDiscount = async (updatedDiscount: Discount) => {
    if (storeCode) {
      try {
        await setDoc(doc(db, "stores", storeCode, "discounts", updatedDiscount.id), updatedDiscount);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `stores/${storeCode}/discounts/${updatedDiscount.id}`);
      }
    } else {
      const updated = discounts.map(d => (d.id === updatedDiscount.id ? updatedDiscount : d));
      setDiscounts(updated);
      saveDiscounts(updated);
    }
  };

  const deleteDiscount = async (id: string) => {
    if (storeCode) {
      try {
        await deleteDoc(doc(db, "stores", storeCode, "discounts", id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `stores/${storeCode}/discounts/${id}`);
      }
    } else {
      const updated = discounts.filter(d => d.id !== id);
      setDiscounts(updated);
      saveDiscounts(updated);
    }
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
        discounts,
        storeCode,
        connectStore,
        generateNewStore,
        disconnectStore,
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
        resetOnlyTransactions,
        addTopping,
        updateTopping,
        deleteTopping,
        addDiscount,
        updateDiscount,
        deleteDiscount
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
