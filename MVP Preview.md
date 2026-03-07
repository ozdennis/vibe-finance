import React, { useState } from 'react';
import { Wallet, CreditCard, Plus, ArrowRightLeft, TrendingUp } from 'lucide-react';

const VibeFinanceMVP = () => {
  const [balance, setBalance] = useState({ cash: 15000000, debt: 8000000 });
  const netLiquidity = balance.cash - balance.debt;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans">
      {/* Net Liquidity Hero */}
      <div className="mb-8 mt-4 text-center">
        <p className="text-slate-400 text-sm uppercase tracking-widest">Net Liquidity</p>
        <h1 className={`text-5xl font-bold mt-1 ${netLiquidity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          Rp {netLiquidity.toLocaleString('id-ID')}
        </h1>
        <p className="text-xs text-slate-500 mt-2">"Your Real Money"</p>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <Wallet className="text-emerald-400 mb-2" size={20} />
          <p className="text-xs text-slate-400">Total Cash</p>
          <p className="font-semibold text-lg">Rp 15M</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <CreditCard className="text-rose-400 mb-2" size={20} />
          <p className="text-xs text-slate-400">CC Debt</p>
          <p className="font-semibold text-lg">Rp 8M</p>
        </div>
      </div>

      {/* Quick Log Input (Frictionless Simulation) */}
      <div className="bg-slate-900 rounded-3xl p-6 border-t-2 border-emerald-500/30">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-emerald-400" /> Quick Log
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 ml-1">Amount</label>
            <input 
              type="text" 
              inputMode="decimal" 
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-2xl font-mono focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex-1 bg-slate-800 p-3 rounded-xl flex items-center justify-center gap-2 text-sm">
              <ArrowRightLeft size={16} /> Transfer
            </button>
            <button className="flex-1 bg-emerald-600 p-3 rounded-xl font-bold text-sm">
              Log Expense
            </button>
          </div>
        </div>
      </div>

      {/* Tax Projection Preview */}
      <div className="mt-8 opacity-60">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="flex items-center gap-1"><TrendingUp size={12}/> Est. Year-End Tax</span>
          <span>Rp 12.400.000</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-amber-500 h-full w-1/3"></div>
        </div>
      </div>
    </div>
  );
};

export default VibeFinanceMVP;