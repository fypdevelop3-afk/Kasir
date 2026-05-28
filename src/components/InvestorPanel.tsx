/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../AppContext";
import { Investor } from "../types";
import { formatRupiah, formatIndoDate } from "../utils/format";
import { 
  Users, HandCoins, Percent, Landmark, Plus, Edit, 
  Trash2, X, AlertTriangle, Briefcase, ChevronRight, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const InvestorPanel: React.FC = () => {
  const { 
    investors, 
    transactions, 
    cashierExpenses, 
    operationalExpenses, 
    addInvestor, 
    updateInvestor, 
    deleteInvestor 
  } = useApp();

  // State for Investor Form
  const [showModal, setShowModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);

  // Form Fields
  const [invName, setInvName] = useState("");
  const [invPercentage, setInvPercentage] = useState<number | "">("");
  const [invCapital, setInvCapital] = useState<number | "">(0);
  const [invContact, setInvContact] = useState("");

  // Controlled modal confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Retrieve current net profit for dividend calculation
  const currentNetProfit = useMemo(() => {
    const grossSalesRaw = transactions.reduce((sum, tx) => sum + tx.total, 0);
    const cogsRaw = transactions.reduce((sum, tx) => sum + tx.costTotal, 0);
    const grossProfit = grossSalesRaw - cogsRaw;
    
    const totalCashierExp = cashierExpenses.reduce((sum, ex) => sum + ex.amount, 0);
    const totalOpsExp = operationalExpenses.reduce((sum, ex) => sum + ex.amount, 0);
    const totalAllExpenses = totalCashierExp + totalOpsExp;

    return grossProfit - totalAllExpenses;
  }, [transactions, cashierExpenses, operationalExpenses]);

  // Total sum of all existing share percentages
  const totalSharesAssigned = useMemo(() => {
    return investors.reduce((sum, inv) => sum + inv.sharePercentage, 0);
  }, [investors]);

  // Load editing investor
  const handleEditClick = (inv: Investor) => {
    setEditingInvestor(inv);
    setInvName(inv.name);
    setInvPercentage(inv.sharePercentage);
    setInvCapital(inv.amountInvested);
    setInvContact(inv.contact);
    setShowModal(true);
  };

  const handleAddNewClick = () => {
    setEditingInvestor(null);
    setInvName("");
    setInvPercentage("");
    setInvCapital("");
    setInvContact("");
    setShowModal(true);
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim() || !invPercentage || !invContact.trim()) {
      alert("Harap lengkapi seluruh kolom formulir!");
      return;
    }

    const percentageNum = Number(invPercentage);
    const capitalNum = 0;

    // Validate percentage limit
    const existingOthers = editingInvestor 
      ? totalSharesAssigned - editingInvestor.sharePercentage 
      : totalSharesAssigned;

    if (existingOthers + percentageNum > 100) {
      alert(`Gagal menyimpan! Total akumulasi persentase seluruh investor melebihi 100% (Sisa kuota: ${100 - existingOthers}%).`);
      return;
    }

    if (editingInvestor) {
      updateInvestor({
        ...editingInvestor,
        name: invName,
        sharePercentage: percentageNum,
        amountInvested: capitalNum,
        contact: invContact,
      });
    } else {
      addInvestor({
        name: invName,
        sharePercentage: percentageNum,
        amountInvested: capitalNum,
        contact: invContact,
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Portal Investor & Bagi Hasil (Profit-Sharing)
          </h3>
          <p className="text-xs text-slate-500">
            Kelola kepemilikan saham modal dan pantau kalkulasi jumlah bagi hasil dividen per investor berdasarkan laba bersih usaha.
          </p>
        </div>
        
        <button
          id="btn-add-investor-trigger"
          onClick={handleAddNewClick}
          className="px-4 py-2.5 bg-indigo-600 font-bold text-white rounded-xl text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Tambah Investor Baru
        </button>
      </div>

      {/* SYSTEM STATS FOR INVESTORS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 font-sans">
          <span className="p-3 bg-amber-55/45 text-amber-600 rounded-xl">
            <Percent className="h-5 w-5" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block text-slate-500">Saham Investor Terdistribusi</span>
            <span className="text-base font-extrabold text-slate-900 block mt-0.5">
              {totalSharesAssigned}%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 font-sans">
          <span className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <Briefcase className="h-5 w-5" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block text-slate-500">Pangsa Pemilik (Internal)</span>
            <span className="text-base font-extrabold text-slate-900 block mt-0.5 animate-pulse text-emerald-700">
              {100 - totalSharesAssigned}%
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-3 font-sans">
          <span className="p-3 bg-emerald-55/45 text-emerald-600 rounded-xl">
            <HandCoins className="h-5 w-5" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block text-slate-500">Laba Bersih Acuan</span>
            <span className="text-base font-extrabold text-slate-900 block mt-0.5 font-mono">
              {formatRupiah(currentNetProfit)}
            </span>
          </div>
        </div>

      </div>

      {/* BRIEF METRIC INFO WARNING */}
      {currentNetProfit <= 0 && (
        <div className="bg-amber-50 border border-amber-150 rounded-2xl p-4 text-xs text-amber-800 flex gap-2.5 items-start">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5 animate-bounce" />
          <div>
            <p className="font-semibold animate-pulse">Perhatian: Laba Bersih Usaha Saat Ini Sedang Minus / Nol</p>
            <p className="mt-0.5 font-medium text-amber-700">
              Karena laba bersih acuan berada pada posisi nihil atau merugi, estimasi porsi saham juga bernilai minus. Pembagian laba hanya dapat ditarik/transfer ketika posisi laba bersih bernilai positif.
            </p>
          </div>
        </div>
      )}

      {/* INVESTOR LIST CARD DETAILS */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs space-y-4">
        <h4 className="font-bold text-slate-800 text-sm">Rincian Pembagian Dividen Investor</h4>
        
        <div className="space-y-3.5">
          {investors.map((inv) => {
            // Calculate dividend proportion (handles both profit and loss)
            const calculatedPayout = (currentNetProfit * inv.sharePercentage) / 100;

            return (
              <div 
                id={`inv-card-${inv.id}`}
                key={inv.id}
                className="p-5 border border-slate-150 rounded-2xl bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-400 transition-all"
              >
                {/* Profile detail */}
                <div className="space-y-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                      <UserCheck className="h-4 w-4" />
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm">{inv.name}</h5>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pl-0.5">
                    <p>Kontak: <span className="font-medium text-slate-700">{inv.contact}</span></p>
                    <p>Gabung: <span className="font-medium text-slate-700">{formatIndoDate(inv.joinedDate)}</span></p>
                  </div>
                </div>

                {/* Percentage holdings */}
                <div className="text-left md:text-center shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Porsi Saham</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5 flex items-center justify-start md:justify-center gap-1">
                    {inv.sharePercentage}%
                    <Percent className="h-3.5 w-3.5 text-indigo-500 inline-block" />
                  </span>
                </div>

                {/* Computed Bagi Hasil Rp */}
                <div className="text-left md:text-right shrink-0 bg-white border border-slate-200 p-2.5 px-4 rounded-xl shadow-2xs min-w-[170px]">
                  <span className="text-[9px] text-indigo-600 font-bold uppercase block tracking-wider">Porsi Laba / Rugi</span>
                  <span className={`text-base font-black font-mono block mt-0.5 ${calculatedPayout >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {calculatedPayout >= 0 ? `+${formatRupiah(calculatedPayout)}` : `-${formatRupiah(Math.abs(calculatedPayout))}`}
                  </span>
                  <span className={`text-[9px] font-bold block mt-0.5 font-sans ${calculatedPayout >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {calculatedPayout >= 0 ? "📈 Posisi Untung" : "📉 Posisi Rugi Saham"}
                  </span>
                </div>

                {/* CRUDS button */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto pt-2 md:pt-0">
                  <button
                    id={`edit-inv-btn-${inv.id}`}
                    onClick={() => handleEditClick(inv)}
                    className="p-1.5 px-3 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    id={`del-inv-btn-${inv.id}`}
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: "Keluarkan Status Investor",
                        message: `Apakah Anda yakin ingin mengeluarkan status kepemilikan investor "${inv.name}" dari sistem?`,
                        onConfirm: () => {
                          deleteInvestor(inv.id);
                        }
                      });
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {investors.length === 0 && (
            <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 flex flex-col items-center justify-center">
              <Users className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-xs font-medium">Belum ada investor terdaftar</p>
              <p className="text-[10px] text-slate-450 mt-1">Gunakan tombol di atas untuk mendaftarkan pendana baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL WINDOW: ADD/EDIT INVESTOR */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-xl overflow-hidden text-slate-850"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-semibold text-sm">
                  {editingInvestor ? "Modifikasi Investor" : "Daftarkan Investor"}
                </h3>
                <button
                  id="close-investor-modal"
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full cursor-pointer text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label htmlFor="invName" className="text-xs font-semibold text-slate-600 block">Nama Lengkap</label>
                  <input
                    id="invName"
                    type="text"
                    required
                    placeholder="Contoh: Pak H. Ridwan..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="invPercentage" className="text-xs font-semibold text-slate-600 block">Porsi Saham / Pembagian Hasil (%)</label>
                  <input
                    id="invPercentage"
                    type="number"
                    required
                    placeholder="Contoh: 15"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={invPercentage}
                    onChange={(e) => setInvPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                    min={1}
                    max={100}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="invContact" className="text-xs font-semibold text-slate-600 block">Kontak WA / Telepon</label>
                  <input
                    id="invContact"
                    type="text"
                    required
                    placeholder="Contoh: 0812-xxxx-xxxx"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={invContact}
                    onChange={(e) => setInvContact(e.target.value)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    id="cancel-investor-btn"
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    id="submit-investor-btn"
                    type="submit"
                    className="w-1/2 py-2 bg-indigo-650 text-white rounded-xl text-xs font-bold hover:bg-indigo-750 shadow-md cursor-pointer"
                  >
                    Simpan Investor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REACT CONFIRMATION MODAL FOR INVESTOR */}
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
                    <p className="text-xs font-semibold text-slate-850">Tindakan ini memerlukan konfirmasi:</p>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold">{confirmModal.message}</p>
                  </div>
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    className="w-1/2 py-2 border border-slate-200 text-slate-650 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
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
                    Keluarkan
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
