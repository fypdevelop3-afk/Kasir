/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Product, Category, StockLog } from "../types";
import { formatRupiah, formatIndoDate } from "../utils/format";
import { 
  Plus, Edit, Trash2, Package, TrendingUp, TrendingDown,
  DollarSign, Landmark, RefreshCw, AlertCircle, ShoppingCart, 
  Settings, Save, X, Calendar, Layers, Info, History, Tag, Sliders, Search, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const AdminPanel: React.FC = () => {
  const { 
    products, 
    transactions, 
    cashierExpenses, 
    operationalExpenses, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    addOperationalExpense,
    storeSettings,
    updateStoreSettings,
    resetAllData,
    categories,
    stockLogs,
    addCategory,
    deleteCategory,
    adjustStock
  } = useApp();

  // Active Tabs in Admin Panel
  const [adminTab, setAdminTab] = useState<"inventory" | "categories" | "stock-history" | "ops-expenses" | "pl" | "settings">("inventory");

  // Custom State-driven Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // State for Product Form
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product input state
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("Makanan");
  const [prodPrice, setProdPrice] = useState<number | "">("");
  const [prodCost, setProdCost] = useState<number | "">("");
  const [prodStock, setProdStock] = useState<number | "">("");
  const [prodMinStock, setProdMinStock] = useState<number | "">("");

  // State for Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<"in" | "out" | "adj">("in");
  const [adjValue, setAdjValue] = useState<number | "">("");
  const [adjNotes, setAdjNotes] = useState("");

  // State for New Category Form
  const [newCatName, setNewCatName] = useState("");

  // Search & Filter state for Stock History Log
  const [searchHistoryQuery, setSearchHistoryQuery] = useState("");
  const [filterHistoryType, setFilterHistoryType] = useState<"all" | "in" | "out" | "adj">("all");

  // State for Operational Expense Form
  const [showOpsExpModal, setShowOpsExpModal] = useState(false);
  const [opsCategory, setOpsCategory] = useState("Gaji");
  const [opsAmount, setOpsAmount] = useState<number | "">("");
  const [opsDesc, setOpsDesc] = useState("");

  // State for Settings Form
  const [setStoreName, setSetStoreName] = useState(storeSettings.storeName);
  const [setStoreAddress, setSetStoreAddress] = useState(storeSettings.address);
  const [setStorePhone, setSetStorePhone] = useState(storeSettings.phone);
  const [setStoreGreeting, setSetStoreGreeting] = useState(storeSettings.greetingMessage);
  const [setStorePin, setSetStorePin] = useState(storeSettings.ownerPin || "1234");
  const [setStoreWhatsapp, setSetStoreWhatsapp] = useState(storeSettings.ownerWhatsapp || "");

  // Load editing product safely
  const handleEditProductClick = (p: Product) => {
    setEditingProduct(p);
    setProdSku(p.sku);
    setProdName(p.name);
    setProdCategory(categories.some(c => c.name === p.category) ? p.category : (categories[0]?.name || "Makanan"));
    setProdPrice(p.price);
    setProdCost(p.cost);
    setProdStock(p.stock);
    setProdMinStock(p.minStock);
    setShowProductModal(true);
  };

  const handleAddNewProductClick = () => {
    setEditingProduct(null);
    setProdSku(`SKU-NEW-${Math.floor(Math.random() * 900) + 100}`);
    setProdName("");
    setProdCategory(categories[0]?.name || "Makanan");
    setProdPrice("");
    setProdCost("");
    setProdStock("");
    setProdMinStock(5);
    setShowProductModal(true);
  };

  // Open Stock Adjustment Modal safely
  const handleAdjustStockClick = (p: Product) => {
    setAdjustingProduct(p);
    setAdjType("in");
    setAdjValue("");
    setAdjNotes("");
    setShowAdjustModal(true);
  };

  // Submit Product Form
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !prodCost || prodStock === "" || prodMinStock === "") {
      alert("Harap lengkapi semua isian formulir produk!");
      return;
    }
    // Inline dynamic warning shown in modal form instead of browser-blocking popups.
    const payload = {
      sku: prodSku || `SKU-PROD-${Date.now().toString().slice(-4)}`,
      name: prodName,
      category: prodCategory,
      price: Number(prodPrice),
      cost: Number(prodCost),
      stock: Number(prodStock),
      minStock: Number(prodMinStock)
    };

    if (editingProduct) {
      updateProduct({
        ...payload,
        id: editingProduct.id
      });
    } else {
      addProduct(payload);
    }

    setShowProductModal(false);
    setEditingProduct(null);
  };

  // Submit Stock Adjustment Form
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || !adjValue || Number(adjValue) <= 0) {
      alert("Harap masukkan kuantitas stok yang valid!");
      return;
    }

    adjustStock(
      adjustingProduct.id,
      Number(adjValue),
      adjType,
      adjNotes.trim() || undefined
    );

    setShowAdjustModal(false);
    setAdjustingProduct(null);
  };

  // Create Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim());
    setNewCatName("");
  };

  // Delete Category with Product safety check
  const handleDeleteCategoryClick = (category: Category) => {
    const usageCount = products.filter(p => p.category === category.name).length;
    if (usageCount > 0) {
      alert(`Kategori "${category.name}" gagal dihapus karena masih digunakan oleh ${usageCount} produk. Pindahkan kategori produk tersebut terlebih dahulu!`);
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Konfirmasi Hapus Kategori",
      message: `Yakin ingin menghapus kategori "${category.name}" seluruhnya?`,
      onConfirm: () => {
        deleteCategory(category.id);
      }
    });
  };

  // Submit Operational Expense Form
  const handleOpsExpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opsAmount || Number(opsAmount) <= 0 || !opsDesc.trim()) {
      alert("Harap isi nominal harga dan rincian deskripsi!");
      return;
    }

    addOperationalExpense({
      category: opsCategory,
      amount: Number(opsAmount),
      description: opsDesc
    });

    setOpsAmount("");
    setOpsDesc("");
    setShowOpsExpModal(false);
  };

  // Save Store Settings
  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setStorePin.trim().length === 0) {
      alert("PIN pemilik tidak boleh kosong!");
      return;
    }
    updateStoreSettings({
      storeName: setStoreName,
      address: setStoreAddress,
      phone: setStorePhone,
      greetingMessage: setStoreGreeting,
      ownerPin: setStorePin,
      ownerWhatsapp: setStoreWhatsapp
    });
    alert("Pengaturan toko & PIN pemilik berhasil diperbarui!");
  };

  // PROFIT & LOSS CALCULATIONS FOR DYNAMIC DATE INTERVAL
  const plCalculations = useMemo(() => {
    // 1. Gross sales revenue
    const grossSalesRaw = transactions.reduce((sum, tx) => sum + tx.total, 0);
    // 2. Cost of Goods Sold (Modal Terjual)
    const cogsRaw = transactions.reduce((sum, tx) => sum + tx.costTotal, 0);
    // 3. Gross Profit (Laba Kotor)
    const grossProfit = grossSalesRaw - cogsRaw;
    
    // 4. Expenses breakdown
    const totalCashierExp = cashierExpenses.reduce((sum, ex) => sum + ex.amount, 0);
    const totalOpsExp = operationalExpenses.reduce((sum, ex) => sum + ex.amount, 0);
    const totalAllExpenses = totalCashierExp + totalOpsExp;

    // 5. Net Profit (Laba Bersih)
    const netProfit = grossProfit - totalAllExpenses;

    return {
      grossSales: grossSalesRaw,
      cogs: cogsRaw,
      grossProfit,
      totalCashierExp,
      totalOpsExp,
      totalAllExpenses,
      netProfit
    };
  }, [transactions, cashierExpenses, operationalExpenses]);

  // Filter products list with low stock for quick viewing/alarms
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= p.minStock);
  }, [products]);

  // Filter stock logs list based on search and filters
  const filteredStockLogs = useMemo(() => {
    return stockLogs.filter(log => {
      // 1. Filter type
      if (filterHistoryType !== "all" && log.type !== filterHistoryType) {
        return false;
      }
      // 2. Search query
      if (searchHistoryQuery.trim() !== "") {
        const query = searchHistoryQuery.toLowerCase();
        return (
          log.productName.toLowerCase().includes(query) ||
          log.sku.toLowerCase().includes(query) ||
          (log.notes && log.notes.toLowerCase().includes(query)) ||
          (log.referenceId && log.referenceId.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [stockLogs, searchHistoryQuery, filterHistoryType]);

  return (
    <div className="space-y-6">
      
      {/* HEADER TABS BAR */}
      <div className="bg-white rounded-3xl border border-slate-150 p-3 shadow-xs flex flex-wrap gap-1.5">
        <button
          id="tab-admin-inventory"
          onClick={() => setAdminTab("inventory")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "inventory"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Package className="h-4 w-4" />
          Stok & Barang {lowStockProducts.length > 0 && (
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          )}
        </button>
        <button
          id="tab-admin-categories"
          onClick={() => setAdminTab("categories")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "categories"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Tag className="h-4 w-4" />
          Kategori Produk
        </button>
        <button
          id="tab-admin-stock-history"
          onClick={() => setAdminTab("stock-history")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "stock-history"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <History className="h-4 w-4" />
          Riwayat Perubahan Stok
        </button>
        <button
          id="tab-admin-ops-expenses"
          onClick={() => setAdminTab("ops-expenses")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "ops-expenses"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Landmark className="h-4 w-4" />
          Biaya Operasional
        </button>
        <button
          id="tab-admin-pl"
          onClick={() => setAdminTab("pl")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "pl"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Laba Rugi (Profit & Loss)
        </button>
        <button
          id="tab-admin-settings"
          onClick={() => setAdminTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            adminTab === "settings"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Settings className="h-4 w-4" />
          Pengaturan Toko
        </button>
      </div>

      {/* Dynamic Tab Rendering */}
      <div>
        
        {/* TAB 1: INVENTORY MANAGEMENT */}
        {adminTab === "inventory" && (
          <div className="space-y-6">
            
            {/* Low stock alerts dashboard band */}
            {lowStockProducts.length > 0 && (
              <div className="bg-amber-50 rounded-3xl border border-amber-150 p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex gap-3">
                  <span className="p-2.5 bg-amber-500 rounded-2xl text-white flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">Alarm Stok Menipis (Notifikasi Otomatis)</h4>
                    <p className="text-[11px] text-amber-700/90 font-medium">Beberapa produk hampir habis atau berada di bawah batas minimum yang ditentukan. Segera restock untuk kepuasan pelanggan.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-amber-250 text-amber-900 rounded-xl text-[10px] font-bold shadow-xs">
                      <span>{p.name}</span>
                      <strong className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[9px]">{p.stock} / min {p.minStock}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Stok Barang & Inventaris Real-time</h3>
                  <p className="text-xs text-slate-500">Kelola daftar menu produk jualan, modal dasar, harga jual, tingkat pengingat stok, dan restock mutasi.</p>
                </div>
                
                <button
                  id="btn-add-new-product"
                  onClick={handleAddNewProductClick}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Barang Baru
                </button>
              </div>

              {/* Inventory table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                      <th className="p-3">SKU</th>
                      <th className="p-3">Nama Produk</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Harga Pokok (Modal)</th>
                      <th className="p-3">Harga Jual</th>
                      <th className="p-3 text-center">Batas Min</th>
                      <th className="p-3">Status & Stok</th>
                      <th className="p-3 text-center">Aksi / Mutasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => {
                      const isOutOfStock = p.stock <= 0;
                      const isLowStock = p.stock > 0 && p.stock <= p.minStock;
                      
                      return (
                        <tr id={`p-row-${p.id}`} key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-slate-500 font-medium">{p.sku}</td>
                          <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="p-3 text-slate-500">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-semibold">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{formatRupiah(p.cost)}</td>
                          <td className="p-3 font-bold text-slate-900">{formatRupiah(p.price)}</td>
                          <td className="p-3 text-center font-mono text-slate-500 font-semibold">{p.minStock}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-bold text-[10px] border border-red-150 animate-pulse">
                                  Habis (0)
                                </span>
                              ) : isLowStock ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-extrabold text-[10px] border border-amber-150">
                                  Tipis ({p.stock})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-150">
                                  Cukup ({p.stock})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                id={`adj-p-btn-${p.id}`}
                                onClick={() => handleAdjustStockClick(p)}
                                className="p-1 px-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                              >
                                <Sliders className="h-3 w-3" />
                                Mutasi Stok
                              </button>
                              
                              <button
                                id={`edit-p-btn-${p.id}`}
                                onClick={() => handleEditProductClick(p)}
                                className="p-1 px-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors text-[10px]"
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </button>
                              <button
                                id={`del-p-btn-${p.id}`}
                                onClick={() => {
                                  setConfirmModal({
                                    isOpen: true,
                                    title: "Konfirmasi Hapus Produk",
                                    message: `Apakah Anda yakin ingin menghapus produk "${p.name}" dari katalog?`,
                                    onConfirm: () => {
                                      deleteProduct(p.id);
                                    }
                                  });
                                }}
                                className="p-1 text-rose-650 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CATEGORY MANAGEMENT */}
        {adminTab === "categories" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kategori Produk</h3>
                <p className="text-xs text-slate-500">Kelompokkan produk jualan untuk efisiensi pemilihan barang pada shift kasir.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Add category form */}
              <div className="md:col-span-1 bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5 text-emerald-600" />
                  Buat Kategori Baru
                </h4>

                <form onSubmit={handleCreateCategory} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="catNameInput" className="text-xs font-semibold text-slate-600 block">Nama Kategori</label>
                    <input
                      id="catNameInput"
                      type="text"
                      placeholder="Contoh: ATK, Sembako, dll..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Tambah Kategori
                  </button>
                </form>

                <div className="p-3 bg-indigo-50 text-[10px] text-indigo-900 border border-indigo-150 rounded-xl space-y-1">
                  <h5 className="font-bold">Tips Pengelompokan:</h5>
                  <p className="leading-normal">
                    Menyediakan kategori yang rapi mempercepat proses kasir dalam mendeteksi dan mengurutkan barang berdasarkan jenisnya di lapangan.
                  </p>
                </div>
              </div>

              {/* Categories list and products count */}
              <div className="md:col-span-2 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Daftar Kategori Tersedia</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => {
                    const usageCount = products.filter(p => p.category === cat.name).length;
                    
                    return (
                      <div key={cat.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center hover:border-slate-300 transition-all">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 text-xs block">{cat.name}</span>
                          <span className="text-[10px] text-slate-450 font-medium block">Digunakan oleh: <strong>{usageCount} produk</strong></span>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteCategoryClick(cat)}
                          className="p-1 px-2.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  })}
                  
                  {categories.length === 0 && (
                    <div className="sm:col-span-2 text-center py-8 text-slate-400 text-xs">
                      Belum ada kategori kustom. Sistem memandu pembuatan kategori baru.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: STOCK HISTORY LOG */}
        {adminTab === "stock-history" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Riwayat Perubahan Stok Barang</h3>
                <p className="text-xs text-slate-500">Log mutasi audit otomatis dan manual untuk setiap produk masuk, produk terjual, maupun penyesuaian lapangan.</p>
              </div>
            </div>

            {/* Logs Search & Filters bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama barang/sku/invoice..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs focus:outline-hidden text-slate-800 placeholder:text-slate-400 font-medium"
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                />
              </div>

              <div>
                <select
                  className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-xs text-slate-800 font-medium"
                  value={filterHistoryType}
                  onChange={(e: any) => setFilterHistoryType(e.target.value)}
                >
                  <option value="all">Semua Jenis Log Mutasi</option>
                  <option value="in">Pemasukan (Inflows / Restock)</option>
                  <option value="out">Pengeluaran (Outflows / Sales)</option>
                  <option value="adj">Penyesuaian (Adjustments)</option>
                </select>
              </div>

              <div className="text-right text-[10px] text-slate-450 font-bold uppercase py-2">
                Ditemukan: <strong>{filteredStockLogs.length} entri</strong>
              </div>

            </div>

            {/* Detailed table list */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                    <th className="p-3">Waktu & Tanggal</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3">Tipe Log</th>
                    <th className="p-3 text-center">Perubahan</th>
                    <th className="p-3 text-center">Stok Awal</th>
                    <th className="p-3 text-center">Stok Akhir</th>
                    <th className="p-3">Keterangan Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockLogs.map((log) => {
                    const isIncrease = log.type === "in";
                    const isDecrease = log.type === "out";
                    const isAdj = log.type === "adj";
                    
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                          {formatIndoDate(log.date)} 
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {new Date(log.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                          </span>
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-500">{log.sku}</td>
                        <td className="p-3 font-semibold text-slate-900">{log.productName}</td>
                        <td className="p-3">
                          {isIncrease ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-lg text-[10px] font-bold">
                              Pemasukan (In)
                            </span>
                          ) : isDecrease ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-150 rounded-lg text-[10px] font-bold">
                              Pengeluaran (Out)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-lg text-[10px] font-bold">
                              Penyesuaian (Adj)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {isIncrease ? (
                            <span className="text-emerald-650">+{log.quantity}</span>
                          ) : isDecrease ? (
                            <span className="text-rose-600">-{log.quantity}</span>
                          ) : (
                            <span className="text-indigo-700">±{log.quantity}</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-500">{log.previousStock}</td>
                        <td className="p-3 text-center font-extrabold text-slate-800">{log.newStock}</td>
                        <td className="p-3 max-w-[200px] truncate text-slate-600 font-medium whitespace-pre-wrap">
                          {log.notes}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStockLogs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada log penyesuaian stok yang cocok dengan kriteria pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: OPERATIONAL EXPENSES */}
        {adminTab === "ops-expenses" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Biaya Pengeluaran Operasional</h3>
                <p className="text-xs text-slate-500">Catat dan tinjau pengeluaran operasional jangka panjang (seperti kuota internet, gaji pegawai, sewa toko dsb).</p>
              </div>
              
              <button
                id="btn-add-new-ops-expense"
                onClick={() => setShowOpsExpModal(true)}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Catat Biaya Operasional
              </button>
            </div>

            {/* Split Grid: Summary stats and List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Stats & Info banner */}
              <div className="md:col-span-1 bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Ringkasan Operasional</h4>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Pengeluaran Bulan Ini</span>
                    <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
                      {formatRupiah(operationalExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Rerata Per Pengeluaran</span>
                    <span className="text-md font-bold text-slate-850 mt-0.5 block">
                      {operationalExpenses.length > 0 
                        ? formatRupiah(operationalExpenses.reduce((sum, e) => sum + e.amount, 0) / operationalExpenses.length) 
                        : "Rp 0"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/55 rounded-xl border border-indigo-100 text-[10px] text-indigo-900 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Biaya operasional admin ini akan memotong keuntungan kotor penjualan ("Laba Kotor") secara otomatis pada laporan Laba Rugi akhir.
                  </p>
                </div>
              </div>

              {/* Expenses logger table */}
              <div className="md:col-span-2 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Riwayat Operasional Terkumpul</h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Deskripsi Rincian</th>
                        <th className="p-3 text-right">Nominal</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {operationalExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-500 font-medium">
                            {formatIndoDate(exp.date)}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{exp.category}</td>
                          <td className="p-3 text-slate-600 max-w-[200px] truncate">{exp.description}</td>
                          <td className="p-3 text-right font-extrabold text-slate-950">
                            {formatRupiah(exp.amount)}
                          </td>
                        </tr>
                      ))}
                      
                      {operationalExpenses.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            Belum ada pengeluaran operasional yang disimpan oleh admin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: PROFIT & LOSS */}
        {adminTab === "pl" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pencatatan Laba Rugi Usaha (Profit & Loss)</h3>
              <p className="text-xs text-slate-500">Evaluasi total kinerja finansial kotor dan bersih, sebaran biaya usaha dan sisa keuntungan bersih real-time.</p>
            </div>

            {/* Profit Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Penjualan Kotor</span>
                  <span className="text-xl font-extrabold text-slate-900 block">
                    {formatRupiah(plCalculations.grossSales)}
                  </span>
                  <p className="text-[9px] text-slate-450 mt-1">Akumulasi uang masuk kasir</p>
                </div>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="h-5 w-5" />
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Modal Terjual (HPP)</span>
                  <span className="text-xl font-extrabold text-slate-900 block">
                    {formatRupiah(plCalculations.cogs)}
                  </span>
                  <p className="text-[9px] text-slate-450 mt-1">Bahan baku / modal dasar produk terjual</p>
                </div>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Package className="h-5 w-5" />
                </span>
              </div>

              <div className={`border rounded-2xl p-4 flex justify-between items-start ${
                plCalculations.netProfit >= 0 
                  ? "bg-emerald-50 text-emerald-950 border-emerald-200" 
                  : "bg-red-50 text-red-950 border-red-200"
              }`}>
                <div className="space-y-1">
                  <span className={`text-[10px] uppercase font-bold ${plCalculations.netProfit >= 0 ? "text-emerald-555" : "text-red-555"}`}>
                    Total Keuntungan Bersih (Laba Bersih)
                  </span>
                  <span className="text-xl font-extrabold block font-mono">
                    {formatRupiah(plCalculations.netProfit)}
                  </span>
                  <p className="text-[9px] mt-1 opacity-70">
                    Sisa bersih setelah dipotong semua jenis biaya
                  </p>
                </div>
                {plCalculations.netProfit >= 0 ? (
                  <span className="p-2 bg-emerald-500 text-white rounded-xl">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                ) : (
                  <span className="p-2 bg-red-500 text-white rounded-xl">
                    <TrendingDown className="h-5 w-5" />
                  </span>
                )}
              </div>

            </div>

            {/* Detailed Ledger Sheet */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 font-sans font-medium">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 border-b border-slate-200 pb-2.5">
                <span>Rincian Laporan Keuangan</span>
                <span>Nominal</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Revenue */}
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">1. Pendapatan Penjualan Kasir (+)</span>
                  <span className="text-slate-900">{formatRupiah(plCalculations.grossSales)}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2 text-slate-500">
                  <span>2. Modal Dasar Bahan / HPP (-)</span>
                  <span>({formatRupiah(plCalculations.cogs)})</span>
                </div>
                
                {/* Gross Profit */}
                <div className="flex justify-between font-bold text-slate-900 pt-1">
                  <span>LABA KOTOR (PENDAPATAN - MODAL) :</span>
                  <span>{formatRupiah(plCalculations.grossProfit)}</span>
                </div>

                {/* Expenses */}
                <div className="space-y-1.5 pt-2 text-slate-600">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-extrabold">Beban Pengurangan Pengeluaran</label>
                  <div className="flex justify-between">
                    <span>• Beban Kembalian & Kecil Kasir (-)</span>
                    <span>{formatRupiah(plCalculations.totalCashierExp)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span>• Beban Operasional Admin (-)</span>
                    <span>{formatRupiah(plCalculations.totalOpsExp)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-slate-755 font-bold">
                  <span>Total Seluruh Beban & Pengeluaran :</span>
                  <span>({formatRupiah(plCalculations.totalAllExpenses)})</span>
                </div>

                {/* Net Income statement */}
                <div className="pt-4 border-t border-slate-300 flex justify-between items-center font-extrabold text-sm text-slate-900 bg-white/40 p-2.5 rounded-xl">
                  <span className="uppercase tracking-wider">LABA BERSIH USAHA (AKHIR) :</span>
                  <span className={`p-1.5 px-3 rounded-lg font-mono ${
                    plCalculations.netProfit >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}>
                    {formatRupiah(plCalculations.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STORE SETTINGS */}
        {adminTab === "settings" && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pengaturan Toko & POS</h3>
              <p className="text-xs text-slate-500">Sesuaikan informasi metadata outlet UMKM Anda yang akan dicetak pada lembar nota digital.</p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="setStoreName" className="text-xs font-semibold text-slate-600 block">Nama Toko / UMKM</label>
                  <input
                    id="setStoreName"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={setStoreName}
                    onChange={(e) => setSetStoreName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="setStorePhone" className="text-xs font-semibold text-slate-600 block">Nomor Telepon Toko/HP</label>
                  <input
                    id="setStorePhone"
                    type="text"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={setStorePhone}
                    onChange={(e) => setSetStorePhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="setStoreAddress" className="text-xs font-semibold text-slate-600 block">Alamat lengkap Outlet</label>
                <input
                  id="setStoreAddress"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={setStoreAddress}
                  onChange={(e) => setSetStoreAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="setStoreGreeting" className="text-xs font-semibold text-slate-600 block">Pesan Salam Nota (Footer)</label>
                <input
                  id="setStoreGreeting"
                  type="text"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={setStoreGreeting}
                  onChange={(e) => setSetStoreGreeting(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="setStoreWhatsapp" className="text-xs font-semibold text-slate-600 block">Nomor WhatsApp Pemilik (Untuk Laporan Shift, format: 628xxx)</label>
                <input
                  id="setStoreWhatsapp"
                  type="text"
                  placeholder="Contoh: 6281234567890"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  value={setStoreWhatsapp}
                  onChange={(e) => setSetStoreWhatsapp(e.target.value.replace(/\D/g, ""))}
                />
                <span className="text-[10px] text-slate-400 block leading-normal mt-0.5">
                  Digunakan untuk menerima notifikasi rincian rekonsiliasi kas secara instan via WhatsApp ketika kasir melakukan tutup shift. Gunakan nomor internasional (awali dengan <b>62</b>, bukan 0).
                </span>
              </div>

              <div className="space-y-1 bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                <label htmlFor="setStorePin" className="text-xs font-bold text-amber-900 block flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                  PIN Pemilik (PIN Owner)
                </label>
                <span className="text-[10px] text-amber-700/80 font-medium block pb-1">
                  Digunakan untuk mengunci dan membatasi akses staff kasir agar tidak sembarangan membuka Laporan Harian, Admin/Stok, dan Investor. Default: <b>1234</b>
                </span>
                <input
                  id="setStorePin"
                  type="text"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="Masukkan 4-8 digit angka PIN"
                  className="w-full max-w-[200px] px-3 py-2 bg-white border border-slate-250 rounded-lg text-xs font-mono font-bold tracking-widest"
                  value={setStorePin}
                  onChange={(e) => setSetStorePin(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <div className="pt-2 flex justify-between items-center gap-4">
                <button
                  id="btn-reset-store-data"
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: "⚠️ Atur Ulang Semua Data (Peringatan Kritis)",
                      message: "Tindakan Kritis: Anda akan menghapus total riwayat transaksi, biaya kasir, biaya operasional, dan mereset sistem ke setelan semula. Data yang terhapus tidak dapat dikembalikan. Lanjutkan?",
                      onConfirm: () => {
                        resetAllData();
                        alert("Pembersihan selesai! Semua data POS telah direset ke setelan asal pabrikan!");
                      }
                    });
                  }}
                  className="py-2.5 px-4 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                >
                  Reset Semua Data POS
                </button>

                <button
                  id="btn-save-settings"
                  type="submit"
                  className="py-2.5 px-5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Save className="h-4 w-4" />
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* MODAL WINDOW: ADD/EDIT PRODUCT */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-xl overflow-hidden text-slate-850"
            >
              <div className="p-4 bg-slate-950/95 text-white flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                  {editingProduct ? `Edit Produk: ${editingProduct.name}` : "Tambah Barang / Menu Baru"}
                </h3>
                <button
                  id="close-product-modal"
                  onClick={() => setShowProductModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="prodSku" className="text-xs font-semibold text-slate-600 block">Kode SKU / Barcode</label>
                    <input
                      id="prodSku"
                      type="text"
                      required
                      placeholder="cth: SKU-KP01"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prodCategory" className="text-xs font-semibold text-slate-600 block">Kategori</label>
                    <select
                      id="prodCategory"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="prodName" className="text-xs font-semibold text-slate-600 block">Nama Produk</label>
                  <input
                    id="prodName"
                    type="text"
                    required
                    placeholder="Contoh: Kopi Caramel Latte..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="prodCost" className="text-xs font-semibold text-slate-600 block">Harga Modal Pokok (Rp)</label>
                    <input
                      id="prodCost"
                      type="number"
                      required
                      placeholder="Modal produk..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      value={prodCost}
                      onChange={(e) => setProdCost(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prodPrice" className="text-xs font-semibold text-slate-600 block">Harga Jual POS (Rp)</label>
                    <input
                      id="prodPrice"
                      type="number"
                      required
                      placeholder="Harga eceran jual..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="prodStock" className="text-xs font-semibold text-slate-600 block">Stok Real-time Saat Ini</label>
                    <input
                      id="prodStock"
                      type="number"
                      required
                      placeholder="Jumlah stok..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="prodMinStock" className="text-xs font-semibold text-slate-600 block">Batas Minimum Alert</label>
                    <input
                      id="prodMinStock"
                      type="number"
                      required
                      placeholder="Minimal level..."
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                  </div>
                </div>

                {Number(prodCost) > 0 && Number(prodPrice) > 0 && Number(prodCost) > Number(prodPrice) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl flex items-start gap-1.5 leading-normal">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><b>Perhatian:</b> Harga modal pokok lebih tinggi dari harga jual BARANG! Penjualan item ini dapat memicu kerugian langsung.</span>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    id="cancel-product-btn"
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-product-btn"
                    type="submit"
                    className="w-1/2 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md"
                  >
                    Simpan Produk
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: ADJUST STOCK QUANTITY */}
      <AnimatePresence>
        {showAdjustModal && adjustingProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-xl overflow-hidden text-slate-850"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="font-semibold text-xs uppercase text-slate-300">Mutasi / Penyesuaian Stok</h3>
                  <h4 className="font-extrabold text-sm">{adjustingProduct.name}</h4>
                </div>
                <button
                  id="close-adjust-modal"
                  onClick={() => setShowAdjustModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block">STOK SAAT INI</span>
                    <span className="text-base font-black text-slate-900 font-mono">{adjustingProduct.stock} unit</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold block">BATAS MINIMUM</span>
                    <span className="text-base font-black text-amber-750 font-mono">{adjustingProduct.minStock} unit</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">Kategori Perubahan</label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjType("in")}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        adjType === "in" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      Masuk (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType("out")}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        adjType === "out" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      Keluar (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjType("adj")}
                      className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                        adjType === "adj" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      Audit (Adj)
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="adjValue" className="text-xs font-semibold text-slate-600 block">
                    Kuantitas Perubahan {adjType === "adj" && "(Bisa + / -)"}
                  </label>
                  <input
                    id="adjValue"
                    type="number"
                    required
                    placeholder="cth: 15"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-mono font-bold"
                    value={adjValue}
                    onChange={(e) => setAdjValue(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  {adjType === "adj" && (
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Nilai positif menambah stok, nilai negatif mengurangi stok lapangan.
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="adjNotes" className="text-xs font-semibold text-slate-600 block">Keterangan / Alasan Perubahan</label>
                  <input
                    id="adjNotes"
                    type="text"
                    placeholder="cth: Restock mingguan, barang rusak, dll"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs font-medium"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="w-1/2 py-2 border border-slate-250 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`w-1/2 py-2 text-white rounded-xl text-xs font-bold shadow-md ${
                      adjType === "in" ? "bg-emerald-600 hover:bg-emerald-700" : adjType === "out" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    Selesaikan Mutasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL WINDOW: ADD/EDIT OPERATIONAL EXPENSE */}
      <AnimatePresence>
        {showOpsExpModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-xl overflow-hidden text-slate-850"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-semibold text-sm">Catat Pengeluaran Operasional</h3>
                <button
                  id="close-ops-expense"
                  onClick={() => setShowOpsExpModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleOpsExpSubmit} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="opsCategory" className="text-xs font-semibold text-slate-600 block">Kategori Biaya</label>
                  <select
                    id="opsCategory"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden"
                    value={opsCategory}
                    onChange={(e) => setOpsCategory(e.target.value)}
                  >
                    <option value="Gaji">Gaji / Payroll Pegawai</option>
                    <option value="Listrik & Air">Listrik & Air Bersih</option>
                    <option value="Internet">Internet / Kuota Toko</option>
                    <option value="Sewa Tempat">Sewa Tempat Tenant</option>
                    <option value="Perlengkapan">Perlengkapan & Renovasi Kecil</option>
                    <option value="Lainnya">Lainnya (Pajak, Izin Usaha dsb)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="opsAmount" className="text-xs font-semibold text-slate-600 block">Nominal Rupiah (Rp)</label>
                  <input
                    id="opsAmount"
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={opsAmount}
                    onChange={(e) => setOpsAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="opsDesc" className="text-xs font-semibold text-slate-600 block">Detail Keterangan</label>
                  <textarea
                    id="opsDesc"
                    required
                    rows={3}
                    placeholder="Tulis alasan, pembayaran untuk bulan apa, atau rincian pembeli..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    value={opsDesc}
                    onChange={(e) => setOpsDesc(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    id="cancel-ops-exp-btn"
                    type="button"
                    onClick={() => setShowOpsExpModal(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-ops-exp-btn"
                    type="submit"
                    className="w-1/2 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow-md"
                  >
                    Simpan Biaya
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GLOBAL REACT-CONTROLLED SYSTEM CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-850">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h4 className="font-bold text-xs">{confirmModal.title}</h4>
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800">Tindakan ini memerlukan konfirmasi:</p>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold">{confirmModal.message}</p>
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmModal.onConfirm();
                      setConfirmModal(null);
                    }}
                    className="w-1/2 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer"
                  >
                    Ya, Lanjutkan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
