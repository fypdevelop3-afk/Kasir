/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Transaction } from "../types";
import { formatRupiah, formatIndoDate } from "../utils/format";
import { 
  Calendar, FileSpreadsheet, Printer, Activity, BarChart3, 
  ChevronRight, BadgeInfo, TrendingUp, DollarSign, Archive, Eye,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleSyncWidget } from "./GoogleSyncWidget";

export const DailyReports: React.FC = () => {
  const { transactions, cashierExpenses, operationalExpenses, shifts, storeSettings } = useApp();

  // Selected relative date filter
  // "today", "yesterday", "all"
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "all">("today");

  // Selected transaction for Receipt Detail Modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Helper date checking
  const getIsToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const getIsYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.getDate() === yesterday.getDate() &&
           d.getMonth() === yesterday.getMonth() &&
           d.getFullYear() === yesterday.getFullYear();
  };

  // Filter lists based on date selected
  const filteredData = useMemo(() => {
    let txFiltered = transactions;
    let cashierExpFiltered = cashierExpenses;
    let opsExpFiltered = operationalExpenses;

    if (dateFilter === "today") {
      txFiltered = transactions.filter(t => getIsToday(t.date));
      cashierExpFiltered = cashierExpenses.filter(e => getIsToday(e.date));
      opsExpFiltered = operationalExpenses.filter(e => getIsToday(e.date));
    } else if (dateFilter === "yesterday") {
      txFiltered = transactions.filter(t => getIsYesterday(t.date));
      cashierExpFiltered = cashierExpenses.filter(e => getIsYesterday(e.date));
      opsExpFiltered = operationalExpenses.filter(e => getIsYesterday(e.date));
    }

    // Totals calculations
    const totalSales = txFiltered.reduce((sum, tx) => sum + tx.total, 0);
    const totalCogs = txFiltered.reduce((sum, tx) => sum + tx.costTotal, 0);
    const totalCashierExp = cashierExpFiltered.reduce((sum, e) => sum + e.amount, 0);
    const totalOpsExp = opsExpFiltered.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = totalCashierExp + totalOpsExp;

    // Gross profit on sales
    const grossProfitVal = totalSales - totalCogs;
    
    // Net profit
    const netProfitVal = grossProfitVal - totalExpenses;

    // Cash On Hand (Physical drawer cash calculation: sales received - cashier petty cash)
    // Note: operational expenses are often bank transfer/by admin, but if we deduct them we show cash on hand
    const cashOnHand = totalSales - totalCashierExp;

    return {
      txs: txFiltered,
      cashierExps: cashierExpFiltered,
      opsExps: opsExpFiltered,
      totalSales,
      totalCogs,
      totalCashierExp,
      totalOpsExp,
      totalExpenses,
      grossProfit: grossProfitVal,
      netProfit: netProfitVal,
      cashOnHand
    };
  }, [dateFilter, transactions, cashierExpenses, operationalExpenses]);

  return (
    <div className="space-y-6">
      
      {/* GOOGLE CLOUD STORAGE & SHEETS SYNCHRONIZATION SYSTEM */}
      <GoogleSyncWidget />
      
      {/* FILTER HEADER SECTION */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            Laporan Harian Otomatis UMKM
          </h3>
          <p className="text-xs text-slate-500">
            Pencatatan rekap keuangan otomatis berdasarkan input kasir dan pengeluaran hari ini.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-100 rounded-xl p-1 shrink-0">
          <button
            id="filter-today"
            onClick={() => setDateFilter("today")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "today"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hari Ini
          </button>
          <button
            id="filter-yesterday"
            onClick={() => setDateFilter("yesterday")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "yesterday"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kemarin
          </button>
          <button
            id="filter-all"
            onClick={() => setDateFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dateFilter === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua Riwayat
          </button>
        </div>
      </div>

      {/* METRIC GRIDS FOR FIELD MANAGEMENT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Sales Omset */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Omset Penjualan</span>
            <span className="text-lg font-black text-slate-950 block font-mono">
              {formatRupiah(filteredData.totalSales)}
            </span>
            <p className="text-[9px] text-slate-500 font-medium">
              {filteredData.txs.length} struk tercetak
            </p>
          </div>
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="h-5 w-5" />
          </span>
        </div>

        {/* Cashier petty expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pengeluaran Kasir</span>
            <span className="text-lg font-black text-rose-650 block font-mono">
              {formatRupiah(filteredData.totalCashierExp)}
            </span>
            <p className="text-[9px] text-slate-500 font-medium">
              {filteredData.cashierExps.length} rincian tercatat
            </p>
          </div>
          <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <Archive className="h-5 w-5" />
          </span>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Biaya Operasional</span>
            <span className="text-lg font-black text-slate-900 block font-mono">
              {formatRupiah(filteredData.totalOpsExp)}
            </span>
            <p className="text-[9px] text-slate-500 font-medium">
              {filteredData.opsExps.length} transaksi diinput
            </p>
          </div>
          <span className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </span>
        </div>

        {/* PHYSICAL DRAWER CASH */}
        <div className="bg-emerald-900 text-white p-4 rounded-2xl border border-emerald-950 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-350 font-bold uppercase tracking-wider flex items-center gap-1">
              Kas di Laci Fisik
              <BadgeInfo className="h-3 w-3 inline text-emerald-300" title="Omset kotor dikurangi pengeluaran eceran kasir" />
            </span>
            <span className="text-lg font-black block font-mono">
              {formatRupiah(filteredData.cashOnHand)}
            </span>
            <p className="text-[9px] text-emerald-200">
              Wajib cocok dengan uang cash di laci!
            </p>
          </div>
          <span className="p-2.5 bg-emerald-800 text-emerald-300 rounded-xl">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
        </div>

      </div>

      {/* MID SECTION: SALES LEDGER LIST AND EXPENSES REPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: LIST OF TRANSACTIONS */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-900 text-sm">Riwayat penjualan & Jurnal Struk</h4>
            <button
              id="export-reports-btn"
              onClick={() => {
                alert("Laporan berhasil disiapkan untuk format Excel/CSV! Anda akan segera mengunduhnya.");
              }}
              className="px-3 py-1.5 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Ekspor Laporan
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                  <th className="p-3">Ref Nota</th>
                  <th className="p-3">Waktu Transaksi</th>
                  <th className="p-3">Kasir</th>
                  <th className="p-3">Total Belanja</th>
                  <th className="p-3">Laba Bersih Struk</th>
                  <th className="p-3 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-medium text-slate-500">{tx.invoiceNumber}</td>
                    <td className="p-3 whitespace-nowrap text-slate-700">
                      {formatIndoDate(tx.date, true)}
                    </td>
                    <td className="p-3 font-medium text-slate-800">{tx.cashierName}</td>
                    <td className="p-3 font-bold text-slate-900">{formatRupiah(tx.total)}</td>
                    <td className="p-3 font-medium text-emerald-700 font-mono">+{formatRupiah(tx.profit)}</td>
                    <td className="p-3 text-center">
                      <button
                        id={`view-tx-receipt-${tx.id}`}
                        onClick={() => setSelectedTx(tx)}
                        className="p-1 px-2 hover:bg-slate-100 rounded-lg text-emerald-600 font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat Nota
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredData.txs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada transaksi penjualan dalam jangka waktu terpilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: LIST OF CASHIER MINOR EXPENSES & OPS EXPENSES */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 p-5 shadow-xs space-y-5">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">Pengeluaran & Modal Outflow</h4>
            <p className="text-[11px] text-slate-450 mt-0.5">Semua pengeluaran toko dan kasir untuk rentang periode ini.</p>
          </div>

          {/* Cashier petty expenses listed */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Eceran Kasir (Minor)</span>
            
            <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
              {filteredData.cashierExps.map((e) => (
                <div key={e.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <h5 className="font-semibold text-slate-800 truncate">{e.description}</h5>
                    <p className="text-[10px] text-slate-450">Kasir: {e.recordedBy} • {e.category}</p>
                  </div>
                  <span className="font-bold text-rose-650 shrink-0">
                    -{formatRupiah(e.amount)}
                  </span>
                </div>
              ))}

              {filteredData.cashierExps.length === 0 && (
                <p className="text-center text-[11px] text-slate-400 py-4">Belum ada pengeluaran kasir.</p>
              )}
            </div>
          </div>

          {/* Operational Expenses list (Admin) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Operasional Usaha (Admin)</span>
            
            <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin pr-1">
              {filteredData.opsExps.map((e) => (
                <div key={e.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <h5 className="font-semibold text-slate-800 truncate">{e.description}</h5>
                    <p className="text-[10px] text-slate-450">{e.category}</p>
                  </div>
                  <span className="font-bold text-rose-650 shrink-0">
                    -{formatRupiah(e.amount)}
                  </span>
                </div>
              ))}

              {filteredData.opsExps.length === 0 && (
                <p className="text-center text-[11px] text-slate-400 py-4">Belum ada pengeluaran operasional.</p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* DETAIL DIALOG MODAL: RECEIPT VIEW */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-xl p-5 relative overflow-hidden text-slate-800 font-sans"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600"></div>
              
              <div className="text-center pb-3">
                <span className="text-[10px] font-mono text-slate-450 uppercase block tracking-wider">Arsip Struk Transaksi</span>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">{selectedTx.invoiceNumber}</h4>
              </div>

              {/* Receipt Body rendering */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono space-y-3">
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500">Kasir:</span>
                  <span className="font-semibold">{selectedTx.cashierName}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500">Waktu:</span>
                  <span className="font-semibold">{formatIndoDate(selectedTx.date, true)}</span>
                </div>

                <div className="space-y-1 max-h-[150px] overflow-y-auto">
                  {selectedTx.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantity}x {it.name}</span>
                      <span>{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-2.5 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>{formatRupiah(selectedTx.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bayar</span>
                    <span>{formatRupiah(selectedTx.cashPaid)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-850 font-bold">
                    <span>Kembali</span>
                    <span>{formatRupiah(selectedTx.cashReturn)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  id="print-journal-receipt"
                  onClick={() => {
                    alert("Mengirim perintah cetak nota ke printer thermal...");
                  }}
                  className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Nota Thermal
                </button>
                <button
                  id="close-journal-tx"
                  onClick={() => setSelectedTx(null)}
                  className="w-full py-2 border border-slate-250 text-slate-650 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Tutup Nota
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RIWAYAT SHIFT KASIR & REKONSILIASI KAS */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm">Riwayat Shift Kasir & Rekonsiliasi Setoran Tunai</h4>
            <p className="text-[11px] text-slate-400 font-medium">Lacak setoran fisik uang tunai laci dari kasir dan selisih (surplus/defisit) per shift.</p>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">Total Rekonsiliasi: {shifts.filter(s => s.isClosed).length} Shift</span>
        </div>

        {shifts.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-6 text-center text-slate-400 text-xs">
            Belum ada data shift kasir historis yang tersimpan.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-slate-600 font-bold">
                  <th className="p-3">Staff Kasir</th>
                  <th className="p-3">Periode Shift</th>
                  <th className="p-3">Modal Awal</th>
                  <th className="p-3">Omset Tunai / Non-Tunai</th>
                  <th className="p-3">Pengeluaran</th>
                  <th className="p-3">Estimasi vs Setoran Faktual</th>
                  <th className="p-3">Selisih & Catatan</th>
                  <th className="p-3 text-center">Aksi Laporan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((sh) => {
                  let diffClass = "text-slate-500 font-sans font-medium";
                  let diffText = "Sesuai";

                  if (sh.difference !== undefined && sh.difference !== null) {
                    if (sh.difference > 0) {
                      diffClass = "text-amber-600 font-sans font-bold";
                      diffText = `Surplus (+) ${formatRupiah(sh.difference)}`;
                    } else if (sh.difference < 0) {
                      diffClass = "text-rose-600 font-sans font-bold";
                      diffText = `Defisit (-) ${formatRupiah(Math.abs(sh.difference))}`;
                    }
                  }

                  const getWhatsAppLink = (shVal: typeof sh) => {
                    let diffTxt = "Sesuai";
                    const diffNum = shVal.difference;
                    if (diffNum !== undefined && diffNum !== null) {
                      if (diffNum > 0) {
                        diffTxt = `Surplus (+${formatRupiah(diffNum)})`;
                      } else if (diffNum < 0) {
                        diffTxt = `Defisit (-${formatRupiah(Math.abs(diffNum))})`;
                      }
                    }

                    const startStr = new Date(shVal.startTime).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
                    const endStr = shVal.endTime ? new Date(shVal.endTime).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
                    const dateStr = formatIndoDate(shVal.startTime);

                    const waText = `📢 *LAPORAN TUTUP SHIFT KASIR*
🏪 *Toko:* ${storeSettings.storeName}
👤 *Kasir:* ${shVal.cashierName}
📅 *Tanggal:* ${dateStr}
⏰ *Waktu:* ${startStr} - ${endStr}

--------------------------------------
💵 *Modal Awal Laci:* ${formatRupiah(shVal.startBalance)}
📈 *Penjualan Tunai:* ${formatRupiah(shVal.cashSales)}
📱 *Penjualan Non-Tunai / QRIS:* ${formatRupiah(shVal.nonCashSales)}
📉 *Pengeluaran Kasir:* -${formatRupiah(shVal.cashExpenses)}
--------------------------------------
🏁 *Estimasi Kas di Laci:* ${formatRupiah(shVal.expectedCash)}
💰 *Total Uang Fisik Laci:* ${shVal.actualDeposit !== undefined ? formatRupiah(shVal.actualDeposit) : "-"}
💸 *Setoran Bersih (Disetor):* ${shVal.actualDeposit !== undefined ? formatRupiah(shVal.actualDeposit - shVal.startBalance) : "-"}
ℹ️ *Sisa Modal Tetap di Laci:* ${formatRupiah(shVal.startBalance)}
⚠️ *Selisih Rekonsiliasi:* ${diffTxt}

📝 *Catatan Shift:* ${shVal.notes || "-"}

_Laporan otomatis via ${storeSettings.storeName} POS._`;

                    const ownerNum = storeSettings.ownerWhatsapp ? storeSettings.ownerWhatsapp.trim().replace(/\D/g, "") : "";
                    return ownerNum 
                      ? `https://api.whatsapp.com/send?phone=${ownerNum}&text=${encodeURIComponent(waText)}`
                      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
                  };

                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-850 font-sans">{sh.cashierName}</div>
                        <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-extrabold inline-block uppercase ${
                          sh.isClosed ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600 border border-emerald-150 animate-pulse"
                        }`}>
                          {sh.isClosed ? "CLOSED" : "ACTIVE / OPEN"}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-700">Mulai: {new Date(sh.startTime).toLocaleTimeString("id-ID")}</div>
                        {sh.endTime && <div className="text-slate-400 font-medium text-[10px]">Selesai: {new Date(sh.endTime).toLocaleTimeString("id-ID")}</div>}
                        <div className="text-[10px] text-slate-450 mt-0.5">{formatIndoDate(sh.startTime, false)}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-600 font-medium">{formatRupiah(sh.startBalance)}</td>
                      <td className="p-3">
                        <div className="text-emerald-600 font-mono">💵 {formatRupiah(sh.cashSales)}</div>
                        <div className="text-indigo-650 font-mono">📱 {formatRupiah(sh.nonCashSales)}</div>
                      </td>
                      <td className="p-3 font-mono text-rose-500 font-medium">-{formatRupiah(sh.cashExpenses)}</td>
                      <td className="p-3">
                        <div className="text-slate-450 font-mono">Expected: {formatRupiah(sh.expectedCash)}</div>
                        {sh.actualDeposit !== undefined ? (
                          <div className="text-slate-800 font-mono font-bold">Fisik: {formatRupiah(sh.actualDeposit)}</div>
                        ) : (
                          <div className="text-slate-400 font-sans italic text-[10px]">Belum disetor</div>
                        )}
                      </td>
                      <td className="p-3">
                        {sh.isClosed ? (
                          <div className="space-y-0.5">
                            <span className={diffClass}>{diffText}</span>
                            {sh.notes && <p className="text-[10px] text-slate-500 italic font-sans max-w-[150px] truncate" title={sh.notes}>Catatan: {sh.notes}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans italic">Sedang berjalan</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {sh.isClosed ? (
                          <a
                            href={getWhatsAppLink(sh)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 rounded-xl font-bold font-sans transition-all text-[11px]"
                            title="Kirim Laporan Shift via WhatsApp"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Kirim WA</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 italic font-sans">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
