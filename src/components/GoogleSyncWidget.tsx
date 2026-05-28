/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useApp } from "../AppContext";
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  getAccessToken,
  setAccessTokenInMemory
} from "../utils/googleAuth";
import { 
  createStoreSpreadsheet, 
  syncAllDataToGoogleSheets, 
  verifySpreadsheetExists 
} from "../utils/googleSheetsService";
import { 
  Cloud, CloudOff, FileSpreadsheet, RefreshCw, 
  CheckCircle, ArrowUpRight, LogOut, Loader2, Sparkles, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const GoogleSyncWidget: React.FC = () => {
  const { products, transactions, cashierExpenses, operationalExpenses, storeSettings } = useApp();

  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Spreadsheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem("kasir_spreadsheet_id");
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem("kasir_spreadsheet_url");
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem("kasir_last_synced");
  });

  // Log and feedback messages
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Initialize Auth state listener on component mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );

    // Try to restore user/token silently if Firebase Auth already has them
    const checkToken = async () => {
      const token = await getAccessToken();
      if (token && currentUserExists()) {
        setAccessToken(token);
      }
    };
    checkToken();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const currentUserExists = (): boolean => {
    return !!user;
  };

  // Triggers Google Sign In
  const handleLogin = async () => {
    setIsAuthLoading(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage({
          text: `Halo ${result.user.displayName}! Akun Google berhasil terhubung.`,
          isError: false
        });

        // Verify if previous saved spreadsheet still exists
        const savedId = localStorage.getItem("kasir_spreadsheet_id");
        if (savedId) {
          const exists = await verifySpreadsheetExists(result.accessToken, savedId);
          if (!exists) {
            // Clear stale id
            localStorage.removeItem("kasir_spreadsheet_id");
            localStorage.removeItem("kasir_spreadsheet_url");
            setSpreadsheetId(null);
            setSpreadsheetUrl(null);
            setStatusMessage({
              text: "Menghubungkan akun Google. Spreadsheet sebelumnya tidak ditemukan di Drive, silakan buat yang baru.",
              isError: false
            });
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        text: err.message || "Gagal masuk menggunakan Google.",
        isError: true
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Triggers Google Sign Out
  const handleLogout = async () => {
    const confirmed = window.confirm("Apakah Anda yakin ingin memutuskan integrasi Google Sheets?");
    if (!confirmed) return;

    setStatusMessage(null);
    try {
      await googleSignOut();
      setUser(null);
      setAccessToken(null);
      // Remove offline token markers
      localStorage.removeItem("kasir_spreadsheet_id");
      localStorage.removeItem("kasir_spreadsheet_url");
      localStorage.removeItem("kasir_last_synced");
      setSpreadsheetId(null);
      setSpreadsheetUrl(null);
      setLastSyncedTime(null);
      setStatusMessage({
        text: "Integrasi Google Sheets berhasil diputuskan.",
        isError: false
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Check and Provision Spreadsheet automatically or manually
  const handleCreateSpreadsheet = async () => {
    if (!accessToken) {
      setStatusMessage({ text: "Sesi Google kedaluwarsa. Silakan masuk kembali.", isError: true });
      return;
    }
    setIsCreatingSheet(true);
    setStatusMessage(null);

    const result = await createStoreSpreadsheet(accessToken, storeSettings.storeName || "Sentosa Jaya POS");
    setIsCreatingSheet(false);

    if (result.success && result.spreadsheetId && result.spreadsheetUrl) {
      localStorage.setItem("kasir_spreadsheet_id", result.spreadsheetId);
      localStorage.setItem("kasir_spreadsheet_url", result.spreadsheetUrl);
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      
      setStatusMessage({
        text: `Berhasil membuat spreadsheet baru! Silakan klik tombol 'Sinkronkan Sekarang' untuk mendistribusikan data.`,
        isError: false
      });
    } else {
      setStatusMessage({
        text: result.message || "Gagal menginisiasi pembuatan google spreadsheet baru.",
        isError: true
      });
    }
  };

  // Sync data to Sheets
  const handleSyncNow = async () => {
    if (!accessToken || !spreadsheetId) {
      setStatusMessage({ text: "Gagal mendeteksi Spreadsheet terhubung.", isError: true });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);

    const result = await syncAllDataToGoogleSheets(
      accessToken,
      spreadsheetId,
      products,
      transactions,
      cashierExpenses,
      operationalExpenses
    );

    setIsSyncing(false);

    if (result.success) {
      const nowStr = new Date().toLocaleString("id-ID");
      localStorage.setItem("kasir_last_synced", nowStr);
      setLastSyncedTime(nowStr);
      setStatusMessage({
        text: result.message,
        isError: false
      });
    } else {
      // Check if unauthorized, token might be expired
      if (result.message.includes("401") || result.message.toLowerCase().includes("unauthorized")) {
        setStatusMessage({
          text: "Sesi Google Anda telah kedaluwarsa. Silakan keluar dan hubungkan kembali Google Anda.",
          isError: true
        });
      } else {
        setStatusMessage({
          text: result.message || "Gagal menyinkronkan data.",
          isError: true
        });
      }
    }
  };

  return (
    <div id="google-sync-card" className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      
      {/* CARD HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <div>
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-100 leading-none">Integrasi Real-Time Google Sheets</h3>
            <span className="text-[10px] text-emerald-100/80 font-medium">Cadangkan dan buka data di perangkat mana saja</span>
          </div>
        </div>
        <div className="flex items-center">
          {user ? (
            <span className="flex items-center gap-1 bg-emerald-500/30 border border-emerald-400/40 text-[9px] font-bold uppercase rounded-full px-2 py-0.5 animate-pulse">
              <Cloud className="h-3 w-3 inline" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-slate-850/40 text-[9px] font-bold uppercase rounded-full px-2 py-0.5 text-slate-300">
              <CloudOff className="h-3 w-3 inline" /> Offline-Local
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        
        {/* LOG LOADING CONTAINER */}
        {isAuthLoading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Menghubungkan layanan awan...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!user ? (
              
              /* INITIAL NO-AUTH LAYOUT */
              <motion.div
                key="no-auth"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4"
              >
                <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2">
                  <div className="flex gap-2 text-emerald-800">
                    <Sparkles className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold">Solusi Data sinkron Multi-Perangkat</h4>
                      <p className="text-[11px] text-emerald-700/90 leading-relaxed mt-0.5">
                        Dengan menautkan akun Google Anda, seluruh data transaksi, daftar harga/stok, dan biaya pengeluaran toko akan <b>otomatis disimpan secara aman langsung di file Google Sheets Anda</b>. Anda bisa membuka spreadsheet tersebut di handphone, laptop, atau tablet lain kapan saja!
                      </p>
                    </div>
                  </div>
                </div>

                {/* SIGN IN WITH GOOGLE BUTTON (OFFICIAL GSI MATERIAL STYLE DESIGNED PURSUANT TO SKILL GUIDANCE) */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLogin}
                    id="btn-google-signin"
                    className="flex items-center gap-3 bg-white border border-slate-300 hover:border-slate-400 font-semibold text-slate-700 px-6 py-2.5 rounded-xl shadow-xs hover:shadow-sm cursor-pointer transition-all active:scale-98 text-xs font-sans"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0 block">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Hubungkan Akun Google Saya</span>
                  </button>
                </div>
              </motion.div>
              
            ) : (
              
              /* LOGGED IN AND ACTIVELY AUTHORIZED */
              <motion.div
                key="auth-active"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4 text-xs"
              >
                {/* User Google Profile */}
                <div className="flex items-center justify-between border border-slate-100 bg-slate-50 p-3 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt={user.displayName || "Google"} className="w-8 h-8 rounded-full border border-slate-200" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xs">
                        {user.displayName?.[0] || "U"}
                      </span>
                    )}
                    <div>
                      <p className="font-extrabold text-slate-850">{user.displayName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    title="Putuskan Akun"
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                {/* SPREADSHEET SETTINGS */}
                <div className="border border-slate-100 rounded-2xl p-4 space-y-3.5">
                  {!spreadsheetId ? (
                    // IF NO SPREADSHEET LINKED
                    <div className="space-y-3 text-center py-2">
                      <div className="inline-block p-2.5 bg-amber-50 text-amber-600 rounded-full">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs text-center">Belum ada Spreadsheet terhubung</h4>
                        <p className="text-[11px] text-slate-400">Silakan inisiasi pembuatan Spreadsheet baru di Google Drive Anda untuk menampung data.</p>
                      </div>
                      
                      <button
                        onClick={handleCreateSpreadsheet}
                        disabled={isCreatingSheet}
                        className="mx-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isCreatingSheet ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Membuat File...</span>
                          </>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>Buat Spreadsheet Baru di Drive</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    // IF SPREADSHEET ALREADY LINKED
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/50">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Spreadsheet Terhubung</span>
                          <span className="font-extrabold text-slate-800 block text-[11px] truncate max-w-[200px]">
                            Laporan Pendapatan & Stok
                          </span>
                          {lastSyncedTime && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Sinkron Terakhir: {lastSyncedTime}
                            </span>
                          )}
                        </div>

                        {spreadsheetUrl && (
                          <a
                            href={spreadsheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 p-1 px-2.5 bg-white text-emerald-700 font-bold border border-emerald-150 rounded-lg hover:bg-emerald-50 transition-all text-[10px]"
                          >
                            <span>Buka Sheet</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* STATS COUNT */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-semibold text-slate-500 py-1">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-slate-800 font-bold text-xs">{products.length}</p>
                          <p className="text-[9px] text-slate-400 uppercase">Produk</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-slate-800 font-bold text-xs">{transactions.length}</p>
                          <p className="text-[9px] text-slate-400 uppercase">Transaksi</p>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-slate-800 font-bold text-xs">{cashierExpenses.length + operationalExpenses.length}</p>
                          <p className="text-[9px] text-slate-400 uppercase">Biaya</p>
                        </div>
                      </div>

                      {/* SYNC TRIGER */}
                      <button
                        onClick={handleSyncNow}
                        disabled={isSyncing}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800 active:scale-98 transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                            <span>Mengunggah data ke Google...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '4s' }} />
                            <span>Sinkronkan Sekarang</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* FEEDBACK STATUS MESSAGE CARD */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl border flex gap-1.5 text-[11px] font-medium leading-relaxed ${
              statusMessage.isError 
                ? "bg-rose-50 border-rose-100 text-rose-800" 
                : "bg-emerald-50 text-emerald-800 border-emerald-100"
            }`}
          >
            {statusMessage.isError ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

      </div>
    </div>
  );
};
