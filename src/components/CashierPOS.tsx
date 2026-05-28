/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Product, CartItem } from "../types";
import { formatRupiah, formatIndoDate } from "../utils/format";
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, ShieldAlert, 
  CheckCircle, Landmark, Receipt, Sparkles, User, FileText, 
  X, AlertTriangle, ArrowRight, CirclePlus, MessageSquare, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const CashierPOS: React.FC = () => {
  const { products, addTransaction, addCashierExpense, cashierExpenses, categories: contextCategories, activeShift, openShift, closeShift, storeSettings } = useApp();
  
  // State for POS
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [cashierName, setCashierName] = useState("Staff Kasir");
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"tunai" | "non-tunai">("tunai");
  
  // Shift Forms
  const [openShiftName, setOpenShiftName] = useState("Staff Kasir");
  const [openShiftBalance, setOpenShiftBalance] = useState<number | "">(100000);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [actualDepositAmount, setActualDepositAmount] = useState<number | "">("");
  const [closeShiftNotes, setCloseShiftNotes] = useState("");
  const [justClosedShift, setJustClosedShift] = useState<any | null>(null);
  const [customReportPhone, setCustomReportPhone] = useState("");
  
  // Modals/Flows
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [lastTxReceipt, setLastTxReceipt] = useState<any>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Cashier Expense Form state
  const [expCategory, setExpCategory] = useState("Parkir");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expDesc, setExpDesc] = useState("");

  // Categories list
  const categoriesList = useMemo(() => {
    const list = Array.from(new Set([
      ...contextCategories.map((c) => c.name),
      ...products.map((p) => p.category)
    ]));
    return ["Semua", ...list];
  }, [products, contextCategories]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "Semua" || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart((prevCart) => {
      const exists = prevCart.find((item) => item.product.id === product.id);
      if (exists) {
        // limit by stock
        if (exists.quantity >= product.stock) return prevCart;
        return prevCart.map((item) => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const originalProduct = products.find((p) => p.id === productId);
    if (!originalProduct) return;
    
    if (quantity > originalProduct.stock) {
      quantity = originalProduct.stock; // Cap at max stock
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const totalCartPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const totalCartCost = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.cost * item.quantity, 0);
  }, [cart]);

  // Suggested quick cash payment list in Indonesian Rupiah
  const suggestedCashAmounts = useMemo(() => {
    const totals = totalCartPrice;
    if (totals <= 0) return [];
    
    const standardBills = [5000, 10000, 20000, 50000, 100000];
    const suggestions = new Set<number>();
    
    // Exact amount
    suggestions.add(totals);
    
    // Find next largest bills
    standardBills.forEach((bill) => {
      if (bill > totals) {
        suggestions.add(bill);
      }
      // multiples of largest bills
      const gap = Math.ceil(totals / bill) * bill;
      if (gap > totals && gap <= totals + 100000) {
        suggestions.add(gap);
      }
    });

    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
  }, [totalCartPrice]);

  // Submit Transaction
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // For non-tunai, cashPaid is automatically the total
    const finalCashPaid = paymentMethod === "non-tunai" ? totalCartPrice : cashPaid;
    const finalCashReturn = paymentMethod === "non-tunai" ? 0 : Math.max(0, finalCashPaid - totalCartPrice);

    if (paymentMethod === "tunai" && finalCashPaid < totalCartPrice) {
      alert("Pembayaran kurang dari total belanja!");
      return;
    }

    const txItems = cart.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      cost: item.product.cost,
      subtotal: item.product.price * item.quantity,
    }));

    const nextTx = addTransaction({
      items: txItems,
      total: totalCartPrice,
      costTotal: totalCartCost,
      profit: totalCartPrice - totalCartCost,
      cashPaid: finalCashPaid,
      cashReturn: finalCashReturn,
      cashierName: activeShift?.cashierName || cashierName,
      paymentMethod,
      notes,
    });

    setLastTxReceipt(nextTx);
    setCart([]);
    setNotes("");
    setCashPaid(0);
    setPaymentMethod("tunai"); // Reset for next transaction
    setCheckoutModalOpen(false);
  };

  // Submit Cashier Expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0 || !expDesc.trim()) {
      alert("Harap masukkan nominal dan deskripsi pengeluaran!");
      return;
    }

    addCashierExpense({
      category: expCategory,
      amount: Number(expAmount),
      description: expDesc,
      recordedBy: activeShift?.cashierName || cashierName,
    });

    setExpAmount("");
    setExpDesc("");
    setShowExpenseModal(false);
  };

  if (!activeShift) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white border border-slate-100 rounded-3xl shadow-lg overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-6 text-white text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-500/15 border border-emerald-400/40 rounded-2xl flex items-center justify-center text-emerald-400">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-white">Mulai Shift Kasir Baru</h3>
            <p className="text-xs text-slate-300">Harap input kas awal laci sebelum memulai pencatatan kasir</p>
          </div>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (!openShiftName.trim()) {
              alert("Harap masukkan nama kasir!");
              return;
            }
            openShift(openShiftName, Number(openShiftBalance) || 0);
          }} 
          className="p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="shift-cashier-name" className="text-sm font-semibold text-slate-700 block">Nama Kasir / Staff Shift</label>
            <input
              id="shift-cashier-name"
              type="text"
              required
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Contoh: Siti Aminah"
              value={openShiftName}
              onChange={(e) => setOpenShiftName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shift-start-balance" className="text-sm font-semibold text-slate-700 block">Uang Modal Awal Laci (Kas Kecil)</label>
            <input
              id="shift-start-balance"
              type="number"
              required
              min={0}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="Masukkan nominal modal..."
              value={openShiftBalance === "" ? "" : openShiftBalance}
              onChange={(e) => setOpenShiftBalance(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>

          {/* Quick balances */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Pilihan Cepat Modal</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 50000, 100000, 200000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setOpenShiftBalance(val)}
                  className={`py-1.5 px-1 border rounded-lg text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                    openShiftBalance === val
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                  }`}
                >
                  {val === 0 ? "Tanpa" : formatRupiah(val).replace(",00", "").replace("Rp", "Rp ")}
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-open-shift-submit"
            type="submit"
            className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Mulai Shift & Aktifkan Kasir</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* SHIFT BANNER INFO */}
      <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xs text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 animate-fade-in">
        <div className="flex gap-3 items-center">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-100">Shift Kasir Aktif: {activeShift.cashierName}</h4>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold animate-pulse uppercase">LIVE</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Mulai: {new Date(activeShift.startTime).toLocaleTimeString("id-ID")} &bull; 
              Modal Awal: <span className="font-mono font-bold text-slate-200">{formatRupiah(activeShift.startBalance)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-slate-800 rounded-xl p-2 px-3 border border-slate-700 text-right font-mono min-w-[150px]">
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider leading-none">Uang Kas di Laci (Est)</span>
            <span className="text-sm font-black text-emerald-400 mt-1 block">
              {formatRupiah(activeShift.expectedCash)}
            </span>
          </div>

          <button
            id="btn-trigger-close-shift"
            onClick={() => {
              setActualDepositAmount(activeShift.expectedCash);
              setCloseShiftNotes("");
              setShowCloseShiftModal(true);
            }}
            className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-red-500/20 shadow-xs"
          >
            <X className="h-3.5 w-3.5" />
            <span>Tutup Shift & Setoran</span>
          </button>
        </div>
      </div>
      
      {/* LEFT PANEL: PRODUCTS INDEX - Grid of Catalog */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* TOP BAR: Search and Filter Category */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="search-pos"
              type="text"
              placeholder="Cari produk / SKU..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-1 justify-start">
            {categoriesList.map((cat) => (
              <button
                id={`cat-${cat}`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* PRODUCTS LIST */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stock <= 0;
            const isLowStock = p.stock > 0 && p.stock <= p.minStock;
            
            return (
              <motion.div
                id={`product-card-${p.id}`}
                key={p.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`bg-white rounded-2xl border p-3 shadow-xs flex flex-col justify-between cursor-pointer group transition-all duration-200 ${
                  isOutOfStock 
                    ? "opacity-60 border-slate-100 pointer-events-none" 
                    : "hover:border-emerald-500 hover:shadow-md border-slate-100"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1 pb-1">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md">
                      {p.sku}
                    </span>
                    {isOutOfStock ? (
                      <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full font-medium">
                        Habis
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-medium animate-pulse">
                        Sisa {p.stock}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded-full font-medium">
                        Stok {p.stock}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors line-clamp-2 mt-1">
                    {p.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">{p.category}</p>
                </div>

                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                  <span className="font-bold text-slate-950 text-sm">
                    {formatRupiah(p.price)}
                  </span>
                  
                  <button
                    id={`add-btn-${p.id}`}
                    disabled={isOutOfStock}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isOutOfStock
                        ? "bg-slate-100 text-slate-400"
                        : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          
          {filteredProducts.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center flex flex-col items-center justify-center text-slate-400">
              <ShieldAlert className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-450 mt-1">Coba sesuaikan kata kunci atau bersihkan kategori filter.</p>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION: Cashier's Minor Expense Recorder */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-3 items-start">
            <span className="p-2.5 bg-rose-50 rounded-xl text-rose-600 mt-0.5 border border-rose-150">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <h5 className="font-semibold text-slate-850 text-sm">Pengeluaran Kecil Kasir</h5>
              <p className="text-xs text-slate-500 max-w-md mt-0.5">
                Ada pengeluaran kecil kas saat shift berjalan (seperti ongkir, parkir, kembalian pecah)? Catat disini agar saldo kasir sesuai.
              </p>
            </div>
          </div>
          
          <button
            id="btn-add-expense"
            onClick={() => setShowExpenseModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <CirclePlus className="h-4 w-4" />
            Catat Pengeluaran Kas
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: CART SECTION & CHECKOUT */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-4 shadow-xs sticky top-4 flex flex-col min-h-[500px] justify-between">
        <div>
          {/* Cart Header */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-md">Keranjang POS</h3>
            </div>
            {cart.length > 0 && (
              <button
                id="pos-clear-cart"
                onClick={() => setCart([])}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kosongkan
              </button>
            )}
          </div>

          {/* User selection/Cashier assignment */}
          <div className="grid grid-cols-2 gap-2 my-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nama Kasir</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                <input
                  id="cashier-name-input"
                  type="text"
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Catatan Pesanan</label>
              <div className="relative">
                <FileText className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                <input
                  id="tx-notes-input"
                  type="text"
                  placeholder="cth: Bungkus, dll"
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[280px] pr-1 py-1 scrollbar-thin">
            {cart.map((item) => (
              <div
                id={`cart-item-${item.product.id}`}
                key={item.product.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <h5 className="text-xs font-semibold text-slate-800 truncate">
                    {item.product.name}
                  </h5>
                  <span className="text-[10px] font-mono text-slate-500">
                    {formatRupiah(item.product.price)} / pcs
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <button
                      id={`dec-qty-${item.product.id}`}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 px-2 text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-bold text-slate-800 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      id={`inc-qty-${item.product.id}`}
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 px-2 text-slate-500 hover:bg-slate-100 cursor-pointer"
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <button
                    id={`remove-cart-${item.product.id}`}
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="p-3 bg-slate-50 rounded-full mb-2">
                  <ShoppingCart className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-xs font-medium">Keranjang masih kosong</p>
                <p className="text-[10px] text-slate-450 mt-1">Pilih menu di sebelah kiri untuk ditambahkan.</p>
              </div>
            )}
          </div>
        </div>

        {/* CART SUMMARY & CHECKOUT TRIGGERS */}
        <div className="pt-3 border-t border-slate-100 mt-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Item ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
              <span>
                {formatRupiah(
                  cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold text-slate-800 text-sm">Total Tagihan</span>
              <span className="font-extrabold text-emerald-600 text-lg">
                {formatRupiah(totalCartPrice)}
              </span>
            </div>
          </div>

          {cart.length > 0 && (
            <div className="space-y-2">
              <button
                id="pos-checkout-trigger"
                onClick={() => setCheckoutModalOpen(true)}
                className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer text-sm"
              >
                Bayar Sekarang
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CHECKOUT / PAYMENT MODAL */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-xl overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-500 rounded-lg text-white">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <h3 className="font-semibold text-sm">Konfirmasi Pembayaran</h3>
                </div>
                <button
                  id="close-checkout"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
                <div className="text-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Pembayaran</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">
                    {formatRupiah(totalCartPrice)}
                  </span>
                </div>

                {/* PILIHAN METODE PEMBAYARAN */}
                <div className="space-y-1.5 animate-fade-in">
                  <span className="text-xs font-semibold text-slate-600 block">Metode Pembayaran</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="pay-method-tunai"
                      type="button"
                      onClick={() => {
                        setPaymentMethod("tunai");
                        setCashPaid(0);
                      }}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "tunai"
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <span>💵 Uang Tunai</span>
                    </button>
                    <button
                      id="pay-method-nontunai"
                      type="button"
                      onClick={() => {
                        setPaymentMethod("non-tunai");
                        setCashPaid(totalCartPrice);
                      }}
                      className={`py-2 px-3 border rounded-xl text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        paymentMethod === "non-tunai"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                      }`}
                    >
                      <span>📱 Non-Tunai / QRIS</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === "tunai" ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="cashPay" className="text-xs font-semibold text-slate-600 block">
                        Uang Tunai Diterima (Rp)
                      </label>
                      <input
                        id="cashPay"
                        type="number"
                        required
                        autoFocus
                        placeholder="Masukkan jumlah tunai..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        value={cashPaid || ""}
                        onChange={(e) => setCashPaid(Number(e.target.value))}
                        min={totalCartPrice}
                      />
                    </div>

                    {/* Suggested amounts (Quick cash buttons) */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Uang Pas & Nominal Sering</span>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestedCashAmounts.map((amt) => (
                          <button
                            id={`quick-pay-${amt}`}
                            key={amt}
                            type="button"
                            onClick={() => setCashPaid(amt)}
                            className={`py-2 px-3 border rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                              cashPaid === amt
                                ? "bg-emerald-50 text-emerald-700 border-emerald-400 shadow-xs"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                            }`}
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Change return output */}
                    {cashPaid >= totalCartPrice && (
                      <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-emerald-800">Uang Kembalian:</span>
                        <span className="text-base font-extrabold text-emerald-700 font-mono">
                          {formatRupiah(cashPaid - totalCartPrice)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 space-y-1.5 animate-fade-in">
                    <span className="text-xs font-bold block">💡 Petunjuk Pembayaran Non-Tunai</span>
                    <p className="text-[11px] text-emerald-700 leading-relaxed font-sans">
                      Silakan arahkan pelanggan ke QRIS Toko atau EDC bank Anda. Transaksi otomatis dicatatkan ke sistem sebagai <b>Non-Tunai</b> sebesar {formatRupiah(totalCartPrice)} tanpa uang kembalian.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    id="cancel-payment"
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="confirm-payment-btn"
                    type="submit"
                    className="w-1/2 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-md"
                  >
                    Proses Transaksi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CASHIER'S MINOR EXPENSE MODAL */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-xl overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-semibold text-sm">Catat Pengeluaran Kasir</h3>
                <button
                  id="close-expense"
                  onClick={() => setShowExpenseModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="expCategory" className="text-xs font-semibold text-slate-600 block">Kategori</label>
                  <select
                    id="expCategory"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                  >
                    <option value="Parkir">Tips / Parkir</option>
                    <option value="Refund">Refund / Pengembalian</option>
                    <option value="Kembalian">Modal Kembalian</option>
                    <option value="Lainnya">Kebutuhan Toko Dadakan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="expAmount" className="text-xs font-semibold text-slate-600 block">Nominal (Rp)</label>
                  <input
                    id="expAmount"
                    type="number"
                    required
                    placeholder="Nominal pengeluaran..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-hidden"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="expDesc" className="text-xs font-semibold text-slate-600 block">Deskripsi / Detail</label>
                  <textarea
                    id="expDesc"
                    required
                    rows={2}
                    placeholder="Contoh: Beli air mineral galon asisten..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    id="cancel-expense"
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-expense"
                    type="submit"
                    className="w-1/2 py-2 bg-slate-900 text-white rounded-xl text-xs hover:bg-slate-800"
                  >
                    Simpan Kasir
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PORTAL receipt popup */}
      <AnimatePresence>
        {lastTxReceipt && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-2xl p-6 relative overflow-hidden text-slate-800"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
              
              <div className="text-center space-y-1 pt-2">
                <span className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600 inline-block">
                  <CheckCircle className="h-6 w-6" />
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-2">Transaksi Sukses!</h3>
                <p className="text-[10px] text-slate-400 font-mono">{lastTxReceipt.invoiceNumber}</p>
              </div>

              {/* Receipt Visual Body */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs mt-4 space-y-3 font-mono">
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-450">Kasir:</span>
                  <span className="font-semibold text-slate-800">{lastTxReceipt.cashierName}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-450">Tanggal:</span>
                  <span className="font-semibold text-slate-800">
                    {formatIndoDate(lastTxReceipt.date, true)}
                  </span>
                </div>
                
                {/* Sale items */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-1">
                  {lastTxReceipt.items.map((it: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span>{it.quantity}x {it.name}</span>
                      <span>{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-sans">Total</span>
                    <span className="font-bold">{formatRupiah(lastTxReceipt.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-sans">Tunai</span>
                    <span>{formatRupiah(lastTxReceipt.cashPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-750">
                    <span className="font-sans">Kembali</span>
                    <span>{formatRupiah(lastTxReceipt.cashReturn)}</span>
                  </div>
                </div>

                {lastTxReceipt.notes && (
                  <div className="bg-white p-2 rounded-lg border border-slate-150 text-[10px] text-slate-500 font-sans">
                    <strong className="text-slate-700 block mb-0.5">Catatan:</strong>
                    {lastTxReceipt.notes}
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <button
                  id="print-receipt"
                  onClick={() => {
                    const formattedDetails = lastTxReceipt.items
                      .map((it: any) => `${it.quantity}x ${it.name} @ ${formatRupiah(it.price)}: ${formatRupiah(it.subtotal)}`)
                      .join("\n");
                    const receiptText = `
=== SENTOSA JAYA POS ===
Nota: ${lastTxReceipt.invoiceNumber}
Waktu: ${formatIndoDate(lastTxReceipt.date, true)}
Kasir: ${lastTxReceipt.cashierName}
------------------------
${formattedDetails}
------------------------
TOTAL: ${formatRupiah(lastTxReceipt.total)}
BAYAR: ${formatRupiah(lastTxReceipt.cashPaid)}
KEMBALI: ${formatRupiah(lastTxReceipt.cashReturn)}
========================
Terima Kasih!
                    `;
                    navigator.clipboard.writeText(receiptText);
                    alert("Nota tercetak digital ke Klippboard! Anda bisa menempel / men-share nota ini.");
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Receipt className="h-4 w-4" />
                  Salin Nota Digital
                </button>
                <button
                  id="close-receipt-modal"
                  onClick={() => setLastTxReceipt(null)}
                  className="w-full py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: TUTUP SHIFT & REKONSILIASI KAS */}
      <AnimatePresence>
        {showCloseShiftModal && activeShift && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-xl overflow-hidden"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-red-500 rounded-lg text-white">
                    <X className="h-4 w-4" />
                  </span>
                  <h3 className="font-semibold text-sm text-white">Tutup Shift & Rekonsiliasi Kas</h3>
                </div>
                <button
                  id="close-shift-modal"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!activeShift) return;
                  
                  const endBalanceEst = activeShift.expectedCash;
                  const finalDeposit = Number(actualDepositAmount) || 0;
                  const shiftSummary = {
                    cashierName: activeShift.cashierName,
                    startTime: activeShift.startTime,
                    endTime: new Date().toISOString(),
                    startBalance: activeShift.startBalance,
                    cashSales: activeShift.cashSales,
                    nonCashSales: activeShift.nonCashSales,
                    cashExpenses: activeShift.cashExpenses,
                    expectedCash: endBalanceEst,
                    actualDeposit: finalDeposit,
                    difference: finalDeposit - endBalanceEst,
                    notes: closeShiftNotes
                  };
                  
                  setJustClosedShift(shiftSummary);
                  setCustomReportPhone(storeSettings?.ownerWhatsapp || "");
                  
                  closeShift(finalDeposit, closeShiftNotes);
                  setShowCloseShiftModal(false);
                }} 
                className="p-5 space-y-4"
              >
                {/* Rincian Shift */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-150 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                    <span className="text-slate-500 font-sans">Nama Kasir:</span>
                    <span className="font-bold text-slate-800 font-sans">{activeShift.cashierName}</span>
                  </div>
                  <div className="flex justify-between font-sans">
                    <span className="text-slate-500">Modal Awal:</span>
                    <span className="font-mono font-semibold text-slate-800">{formatRupiah(activeShift.startBalance)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-sans font-medium">
                    <span>(+) Penjualan Tunai:</span>
                    <span className="font-mono">{formatRupiah(activeShift.cashSales)}</span>
                  </div>
                  <div className="flex justify-between text-indigo-600 font-sans font-medium">
                    <span>📱 Penjualan Non-Tunai / QRIS:</span>
                    <span className="font-mono">{formatRupiah(activeShift.nonCashSales)}</span>
                  </div>
                  <div className="flex justify-between text-rose-500 font-sans font-medium pb-2 border-b border-dashed border-slate-200">
                    <span>(-) Pengeluaran Kasir:</span>
                    <span className="font-mono">-{formatRupiah(activeShift.cashExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-sans font-extrabold text-slate-900 pt-1 text-right">
                    <span>Estimasi Kas Laci (expected):</span>
                    <span className="font-mono font-bold text-slate-950">{formatRupiah(activeShift.expectedCash)}</span>
                  </div>
                </div>

                {/* Input Setoran Aktual */}
                <div className="space-y-1.5 animate-fade-in">
                  <label htmlFor="shift-actual-deposit" className="text-xs font-semibold text-slate-700 block font-sans">
                    Jumlah Uang Tunai Aktual di Laci (Setor Tunai)
                  </label>
                  <input
                    id="shift-actual-deposit"
                    type="number"
                    required
                    min={0}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-red-500 opacity-100"
                    placeholder="Masukkan jumlah fisik uang cash..."
                    value={actualDepositAmount === "" ? "" : actualDepositAmount}
                    onChange={(e) => setActualDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                  <p className="text-[10px] text-slate-400 font-sans">
                    Hitung uang tunai fisik yang ada di laci kasir sekarang dan masukkan di sini.
                  </p>
                </div>

                {/* Selisih Output */}
                {actualDepositAmount !== "" && (
                  <div className={`rounded-xl p-3 border text-xs font-sans font-semibold flex justify-between items-center ${
                    Number(actualDepositAmount) === activeShift.expectedCash
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                      : Number(actualDepositAmount) > activeShift.expectedCash
                      ? "bg-amber-50 border-amber-150 text-amber-800"
                      : "bg-rose-50 border-rose-150 text-rose-800"
                  }`}>
                    <span>Selisih Setoran Kasir:</span>
                    <span className="font-mono font-bold text-xs">
                      {Number(actualDepositAmount) === activeShift.expectedCash
                        ? "Sesuai (Rp 0)"
                        : Number(actualDepositAmount) > activeShift.expectedCash
                        ? `Surplus (+) ${formatRupiah(Number(actualDepositAmount) - activeShift.expectedCash)}`
                        : `Defisit (-) ${formatRupiah(activeShift.expectedCash - Number(actualDepositAmount))}`}
                    </span>
                  </div>
                )}

                {/* Catatan Setoran */}
                <div className="space-y-1 animate-fade-in">
                  <label htmlFor="shift-close-notes" className="text-xs font-semibold text-slate-600 block font-sans">
                    Catatan / Alasan Selisih
                  </label>
                  <textarea
                    id="shift-close-notes"
                    rows={2}
                    placeholder="Masukkan catatan jika ada ketidaksesuaian atau keterangan shift..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-sans focus:outline-hidden"
                    value={closeShiftNotes}
                    onChange={(e) => setCloseShiftNotes(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    id="cancel-close-shift"
                    type="button"
                    onClick={() => setShowCloseShiftModal(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="confirm-close-shift-btn"
                    type="submit"
                    className="w-1/2 py-2 bg-red-650 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer shadow-md"
                  >
                    Setor & Tutup Shift
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHIFT CLOSED REPORT OVERLAY WITH WHATSAPP DISPATCH */}
      <AnimatePresence>
        {justClosedShift && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-fade-in text-slate-850">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-white/10 text-white rounded-full p-1 cursor-pointer hover:bg-white/20" onClick={() => {
                  setJustClosedShift(null);
                  setActualDepositAmount("");
                  setCloseShiftNotes("");
                }}>
                  <X className="h-5 w-5" />
                </div>
                <div className="mx-auto w-10 h-10 bg-white/20 flex items-center justify-center rounded-full mb-2">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-extrabold text-white text-base">Shift Kasir Berhasil Ditutup!</h3>
                <p className="text-[11px] text-emerald-100 font-medium">Rekonsiliasi setoran & pembukuan kas laci telah disimpan otomatis.</p>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 border border-slate-150 rounded-2xl p-4 font-medium text-slate-600 font-sans">
                  <div>
                    <span className="text-[10px] text-slate-450 block uppercase font-bold">KASIR / OPERATOR:</span>
                    <span className="font-bold text-slate-800">{justClosedShift.cashierName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-450 block uppercase font-bold">WAKTU TUTUP:</span>
                    <span className="font-mono text-slate-800">{new Date(justClosedShift.endTime).toLocaleTimeString("id-ID")} WIB</span>
                  </div>
                  <div className="col-span-2 border-t border-dashed border-slate-200 pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">MODAL AWAL LACI:</span>
                      <span className="font-mono font-bold text-slate-700">{formatRupiah(justClosedShift.startBalance)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">ESTIMASI SEHARUSNYA:</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(justClosedShift.expectedCash)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">SETORAN FISIK AKTUAL:</span>
                      <span className="font-mono font-black text-emerald-700">{formatRupiah(justClosedShift.actualDeposit)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">SELISIH KAS LACI:</span>
                      <span className={`font-mono font-bold ${
                        justClosedShift.difference === 0 
                          ? "text-slate-500" 
                          : justClosedShift.difference > 0 
                          ? "text-amber-600" 
                          : "text-rose-600"
                      }`}>
                        {justClosedShift.difference === 0 
                          ? "Sesuai" 
                          : justClosedShift.difference > 0 
                          ? `Surplus (+${formatRupiah(justClosedShift.difference)})` 
                          : `Defisit (-${formatRupiah(Math.abs(justClosedShift.difference))})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp destination input */}
                <div className="space-y-1">
                  <label htmlFor="wa-dest-phone" className="text-xs font-bold text-slate-700 block">Kirim Laporan Kasir via WhatsApp:</label>
                  <div className="flex gap-2">
                    <input
                      id="wa-dest-phone"
                      type="text"
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      placeholder="Contoh: 6281234567890 (awali 62)"
                      value={customReportPhone}
                      onChange={(e) => setCustomReportPhone(e.target.value.replace(/\D/g, ""))}
                    />
                    <a
                      href={(() => {
                        let diffTxt = "Sesuai";
                        const diffNum = justClosedShift.difference;
                        if (diffNum > 0) {
                          diffTxt = `Surplus (+${formatRupiah(diffNum)})`;
                        } else if (diffNum < 0) {
                          diffTxt = `Defisit (-${formatRupiah(Math.abs(diffNum))})`;
                        }

                        const startStr = new Date(justClosedShift.startTime).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
                        const endStr = new Date(justClosedShift.endTime).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
                        const dateStr = formatIndoDate(justClosedShift.startTime);

                        const waText = `📢 *LAPORAN TUTUP SHIFT KASIR*
🏪 *Toko:* ${storeSettings.storeName}
👤 *Kasir:* ${justClosedShift.cashierName}
📅 *Tanggal:* ${dateStr}
⏰ *Waktu:* ${startStr} - ${endStr}

--------------------------------------
💵 *Modal Awal Laci:* ${formatRupiah(justClosedShift.startBalance)}
📈 *Penjualan Tunai:* ${formatRupiah(justClosedShift.cashSales)}
📱 *Penjualan Non-Tunai / QRIS:* ${formatRupiah(justClosedShift.nonCashSales)}
📉 *Pengeluaran Kasir:* -${formatRupiah(justClosedShift.cashExpenses)}
--------------------------------------
🏁 *Estimasi Kas di Laci:* ${formatRupiah(justClosedShift.expectedCash)}
💰 *Total Uang Fisik Laci:* ${formatRupiah(justClosedShift.actualDeposit)}
💸 *Setoran Bersih (Disetor):* ${formatRupiah(justClosedShift.actualDeposit - justClosedShift.startBalance)}
ℹ️ *Sisa Modal Tetap di Laci:* ${formatRupiah(justClosedShift.startBalance)}
⚠️ *Selisih Rekonsiliasi:* ${diffTxt}

📝 *Catatan Shift:* ${justClosedShift.notes || "-"}

_Laporan otomatis via ${storeSettings.storeName} POS._`;

                        const destNum = customReportPhone.trim().replace(/\D/g, "");
                        return destNum 
                          ? `https://api.whatsapp.com/send?phone=${destNum}&text=${encodeURIComponent(waText)}`
                          : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Kirim WA</span>
                    </a>
                  </div>
                  <span className="text-[10px] text-slate-450 block mt-0.5">
                    Membuat tautan otomatis untuk membagikan rincian pertanggungjawaban laci kas ke WhatsApp Pemilik/Manager secara langsung.
                  </span>
                </div>

                {/* Preview text */}
                <div className="space-y-1 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">PRATINJAU PESAN REKAPITULASI:</span>
                  <pre className="text-[10px] font-mono leading-relaxed bg-slate-100 hover:bg-slate-200/50 cursor-copy p-2.5 text-slate-700 rounded-lg whitespace-pre-wrap select-all font-sans" title="Klik untuk menyalin teks" onClick={(e) => {
                    const targetEl = e.target as HTMLElement;
                    const textContent = targetEl.innerText || targetEl.textContent || "";
                    navigator.clipboard.writeText(textContent);
                    alert("Rincian Laporan berhasil disalin ke papan klip!");
                  }}>
                    {`📢 LAPORAN TUTUP SHIFT KASIR
🏪 Toko: ${storeSettings.storeName}
👤 Kasir: ${justClosedShift.cashierName}
📅 Tanggal: ${formatIndoDate(justClosedShift.startTime)}
⏰ Waktu: ${new Date(justClosedShift.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${new Date(justClosedShift.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}

--------------------------------------
💵 Modal Awal Laci: ${formatRupiah(justClosedShift.startBalance)}
📈 Penjualan Tunai: ${formatRupiah(justClosedShift.cashSales)}
📱 Penjualan Non-Tunai / QRIS: ${formatRupiah(justClosedShift.nonCashSales)}
📉 Pengeluaran Kasir: -${formatRupiah(justClosedShift.cashExpenses)}
--------------------------------------
🏁 Estimasi Kas di Laci: ${formatRupiah(justClosedShift.expectedCash)}
💰 Total Uang Fisik Laci: ${formatRupiah(justClosedShift.actualDeposit)}
💸 Setoran Bersih (Disetor): ${formatRupiah(justClosedShift.actualDeposit - justClosedShift.startBalance)}
ℹ️ Sisa Modal Tetap di Laci: ${formatRupiah(justClosedShift.startBalance)}
⚠️ Selisih Rekonsiliasi: ${justClosedShift.difference === 0 ? "Sesuai" : justClosedShift.difference > 0 ? `Surplus (+${formatRupiah(justClosedShift.difference)})` : `Defisit (-${formatRupiah(Math.abs(justClosedShift.difference))})`}

📝 Catatan Shift: ${justClosedShift.notes || "-"}

Laporan otomatis via ${storeSettings.storeName} POS.`}
                  </pre>
                  <span className="text-[9px] text-slate-400 block italic text-center mt-1">💡 Tips: Klik area teks di atas untuk menyalin laporan secara cepat!</span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setJustClosedShift(null);
                      setActualDepositAmount("");
                      setCloseShiftNotes("");
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Selesai & Keluar POS
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
