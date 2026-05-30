/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useApp } from "../AppContext";
import { CashierPOS } from "./CashierPOS";
import { AdminPanel } from "./AdminPanel";
import { InvestorPanel } from "./InvestorPanel";
import { DailyReports } from "./DailyReports";
import { 
  ShoppingCart, Landmark, Users, Activity, Store, 
  MapPin, Phone, RefreshCw, Calendar, Sparkles, AlertTriangle,
  Lock, Unlock, X, ShieldAlert
} from "lucide-react";
import { formatIndoDate } from "../utils/format";
import { motion, AnimatePresence } from "motion/react";

export const Layout: React.FC = () => {
  const { storeSettings, products } = useApp();
  
  // Active viewing stage
  const [activeTab, setActiveTab] = useState<"pos" | "reports" | "admin" | "investor" | "locked">("pos");

  // Role Protection states
  const [isOwnerMode, setIsOwnerMode] = useState<boolean>(() => {
    return sessionStorage.getItem("is_owner_mode") === "true";
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<"pos" | "reports" | "admin" | "investor" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Determine low stock items overall to display a tiny blinking indicator
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // Tabs clicking handler
  const handleTabClick = (tab: "pos" | "reports" | "admin" | "investor") => {
    if (tab === "pos") {
      setActiveTab("pos");
      return;
    }
    
    // Check if Owner Mode is unlocked
    if (isOwnerMode) {
      setActiveTab(tab);
    } else {
      setPendingTab(tab);
      setShowPinModal(true);
      setPinInput("");
      setErrorMsg("");
    }
  };

  // Lock session back to Kasir-only
  const handleLockSession = () => {
    setIsOwnerMode(false);
    sessionStorage.removeItem("is_owner_mode");
    setActiveTab("pos");
  };

  // Handler for PIN numpad clicks
  const handleDigitClick = (val: string) => {
    if (val === "C") {
      setPinInput("");
      setErrorMsg("");
      return;
    }
    if (val === "⌫") {
      setPinInput(prev => prev.slice(0, -1));
      setErrorMsg("");
      return;
    }
    if (pinInput.length < 8) {
      setPinInput(prev => prev + val);
      setErrorMsg("");
    }
  };

  // Submit PIN
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = storeSettings.ownerPin || "1234";
    if (pinInput === correctPin) {
      setIsOwnerMode(true);
      sessionStorage.setItem("is_owner_mode", "true");
      setErrorMsg("");
      setPinInput("");
      setShowPinModal(false);
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    } else {
      setErrorMsg("PIN pemilik salah! Akses ditolak.");
      setPinInput("");
    }
  };

  // Keyboard support for Pin Modal
  useEffect(() => {
    if (!showPinModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigitClick(e.key);
      } else if (e.key === "Backspace") {
        handleDigitClick("⌫");
      } else if (e.key === "Escape") {
        setShowPinModal(false);
        setPendingTab(null);
      } else if (e.key === "Enter") {
        handlePinSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPinModal, pinInput, pendingTab, storeSettings.ownerPin]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          
          {/* Logo & Store Information */}
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-700/10">
              <Store className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-slate-950 text-base sm:text-lg leading-none">
                  {storeSettings.storeName || "Kasir UMKM Sahabat"}
                </h1>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                  UMKM Pintar
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400 font-medium">
                {storeSettings.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {storeSettings.address}
                  </span>
                )}
                {storeSettings.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {storeSettings.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Calendar, Lock Mode Status, & Low Stock indicators */}
          <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-100 p-1.5 px-3 rounded-xl text-[10px] font-bold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                <span>{lowStockCount} Barang Menipis</span>
              </div>
            )}
            
            <div className="text-right text-slate-600 space-y-0.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Jam Operasional</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-600 inline-block" />
                {formatIndoDate(new Date(), false)}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* NAVIGATION TABS RAIL */}
      <nav className="bg-slate-900 text-slate-350 sticky top-[73px] sm:top-[74px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 sm:py-0">
          <div className="flex overflow-x-auto scrollbar-none gap-2 font-medium">
            <button
              id="nav-pos"
              onClick={() => handleTabClick("pos")}
              className={`flex items-center gap-2 py-4 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === "pos"
                  ? "border-emerald-500 text-white bg-slate-850"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              Kasir POS (Shift Kasir)
            </button>
            <button
              id="nav-reports"
              onClick={() => handleTabClick("reports")}
              className={`flex items-center gap-2 py-4 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "border-emerald-500 text-white bg-slate-850"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Activity className="h-4 w-4 animate-pulse text-amber-555" />
              <span>Laporan Harian</span>
              {!isOwnerMode && <Lock className="h-3 w-3 text-slate-400 inline shrink-0" />}
            </button>
            <button
              id="nav-admin"
              onClick={() => handleTabClick("admin")}
              className={`flex items-center gap-2 py-4 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === "admin"
                  ? "border-emerald-500 text-white bg-slate-850"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>Administrasi & Stok</span>
              {!isOwnerMode && <Lock className="h-3 w-3 text-slate-400 inline shrink-0" />}
            </button>
            <button
              id="nav-investor"
              onClick={() => handleTabClick("investor")}
              className={`flex items-center gap-2 py-4 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === "investor"
                  ? "border-emerald-500 text-white bg-slate-850"
                  : "border-transparent text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Portal Investor</span>
              {!isOwnerMode && <Lock className="h-3 w-3 text-slate-400 inline shrink-0" />}
            </button>
          </div>

          {/* Quick lock status button for owner machine */}
          <div className="flex items-center justify-end px-4 py-1 sm:py-0 gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hidden md:inline">Peran Aktif:</span>
            <div className="relative">
              <select
                id="role-permission-select"
                value={isOwnerMode ? "owner" : "cashier"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "owner") {
                    setPendingTab(null);
                    setShowPinModal(true);
                    setPinInput("");
                    setErrorMsg("");
                  } else {
                    handleLockSession();
                  }
                }}
                className={`text-[11px] font-black rounded-xl px-3 py-1.5 border transition-all outline-none cursor-pointer focus:ring-1 focus:ring-emerald-500 hover:border-slate-300 ${
                  isOwnerMode 
                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/35 font-extrabold"
                    : "bg-slate-800 text-slate-350 border-slate-700/80"
                }`}
              >
                <option value="cashier" className="bg-slate-900 text-slate-300 font-semibold">👤 Staff Kasir (Terbatas)</option>
                <option value="owner" className="bg-slate-900 text-emerald-400 font-extrabold">👑 Pemilik / Owner (Full)</option>
              </select>
            </div>

            {isOwnerMode ? (
              <button
                id="btn-lock-session"
                onClick={handleLockSession}
                className="flex items-center gap-1 py-1.5 px-2.5 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                title="Selesaikan sesi pemilik dan kunci kembali untuk Kasir"
              >
                <Unlock className="h-3 w-3" />
                Kunci Kasir
              </button>
            ) : (
              <button
                id="btn-unlock-session"
                onClick={() => { setPendingTab(null); setShowPinModal(true); setPinInput(""); setErrorMsg(""); }}
                className="flex items-center gap-1 py-1.5 px-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white border border-slate-700/80 rounded-xl text-[10px] font-medium transition-all cursor-pointer"
                title="Buka akses Laporan dan Admin dengan PIN Pemilik"
              >
                <Lock className="h-3 w-3 text-slate-400" />
                Eskalasi PIN
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* CORE WORKSPACE CONTENT AREA WITH PERMISSION GUARDING */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === "pos" && <CashierPOS />}
        
        {activeTab === "reports" && (
          isOwnerMode ? (
            <DailyReports />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs max-w-lg mx-auto my-12 space-y-6 animate-fade-in" id="report-guard-view">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-base">Akses Laporan Terbatas</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Laporan keuangan harian bersifat rahasia dan membutuhkan otorisasi untuk dibuka. Silakan masukkan PIN Pemilik untuk membuka akses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPendingTab("reports"); setShowPinModal(true); setPinInput(""); setErrorMsg(""); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Masuk dengan PIN Pemilik
              </button>
            </div>
          )
        )}
        
        {activeTab === "admin" && (
          isOwnerMode ? (
            <AdminPanel />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs max-w-lg mx-auto my-12 space-y-6 animate-fade-in" id="admin-guard-view">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-base">Modul Administrasi & Stok Terkunci</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Peran aktif saat ini adalah <b>Staff Kasir</b>. Anda dilarang mengakses AdminPanel karena membutuhkan hak akses <b>Pemilik / Owner</b>. Gunakan PIN untuk eskalasi hak akses.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPendingTab("admin"); setShowPinModal(true); setPinInput(""); setErrorMsg(""); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Verifikasi Hak Akses Pemilik
              </button>
            </div>
          )
        )}
        
        {activeTab === "investor" && (
          isOwnerMode ? (
            <InvestorPanel />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs max-w-lg mx-auto my-12 space-y-6 animate-fade-in" id="investor-guard-view">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-base">Akses Portal Investor Dilindungi</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Data kemitraan & Portal Investor dilindungi PIN Pemilik untuk pengamanan informasi modal finansial bersama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setPendingTab("investor"); setShowPinModal(true); setPinInput(""); setErrorMsg(""); }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Masukkan PIN Pemilik
              </button>
            </div>
          )
        )}
      </main>

      {/* PIN ENTRY MODAL (INTERACTIVE NUMPAD OVERLAY) */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden text-slate-800"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <span className="font-bold text-xs tracking-wider uppercase text-slate-100">Proteksi Sesi Pemilik</span>
                </div>
                <button
                  onClick={() => { setShowPinModal(false); setPendingTab(null); }}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 text-center space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900">Masukkan PIN Pemilik / Owner</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {pendingTab 
                      ? "Butuh otorisasi pemilik untuk membuka tab keuangan & stok ini." 
                      : "Verifikasi PIN pemilik untuk membuka semua panel administratif."}
                  </p>
                </div>

                {/* PIN Masked Circular Indicator Dots */}
                <div className="flex justify-center gap-3.5 py-2">
                  {[...Array(4)].map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full border border-slate-300 transition-all duration-150 ${
                        pinInput.length > idx ? "bg-slate-900 scale-110 shadow-xs" : "bg-slate-100"
                      }`}
                    />
                  ))}
                  {pinInput.length > 4 && (
                    <span className="text-xs font-mono font-bold text-slate-500 align-middle pt-0.5">+{pinInput.length - 4}</span>
                  )}
                </div>

                {/* Secret Warning or PIN Instruction */}
                {errorMsg ? (
                  <p className="text-xs text-red-650 font-bold bg-red-50 border border-red-100 p-2 rounded-xl animate-shake">
                    {errorMsg}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-450 font-medium">
                    Ketik menggunakan nirkabel keyboard atau klik tombol di bawah (Default: <b>1234</b>)
                  </p>
                )}

                {/* Grid Numpad Button Layout */}
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleDigitClick(btn)}
                      className={`h-12 rounded-2xl flex items-center justify-center font-bold text-sm cursor-pointer active:scale-95 transition-all text-slate-800 border ${
                        btn === "C"
                          ? "bg-red-50 hover:bg-red-100 text-red-650 border-red-100"
                          : btn === "⌫"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                {/* Action button to proceed */}
                <button
                  onClick={() => handlePinSubmit()}
                  disabled={pinInput.length === 0}
                  className="w-full py-3 bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-2xl text-xs font-extrabold hover:bg-slate-800 transition-all cursor-pointer shadow-md disabled:shadow-none"
                >
                  Otorisasi & Masuk Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER BAR */}
      <footer className="bg-white border-t border-slate-100 py-6 text-slate-400 text-center text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-medium text-slate-450">
            &copy; 2026 {storeSettings.storeName}. {storeSettings.greetingMessage || "Layanan POS Digital Terintegrasi Real-time."}
          </p>
          <div className="flex gap-4 text-[10px] text-slate-400 font-mono">
            <span>MODE: {isOwnerMode ? "PEMILIK (UNLOCKED)" : "KASIR (RESTRICTED)"}</span>
            <span>UMKM LOKAL INDONESIA MAJU</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
