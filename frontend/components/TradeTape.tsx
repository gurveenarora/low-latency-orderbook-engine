"use client";

import React from 'react';
import { Radio, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Trade {
  id: string;
  price: number;
  qty: number;
  side: 'BUY' | 'SELL';
  latency_us: number;
  timestamp: string;
}

interface TradeTapeProps {
  trades: Trade[];
}

export default function TradeTape({ trades }: TradeTapeProps) {
  const displayTrades = [...trades].reverse().slice(0, 15);

  return (
    <div className="bg-cardBg border border-borderDark rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-borderDark pb-3 mb-3">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          LIVE EXECUTION TRADE TAPE
        </h2>
        <span className="text-xs font-mono text-slate-400">{trades.length} Total Fills</span>
      </div>

      <div className="grid grid-cols-4 text-[10px] font-mono text-slate-400 pb-2 px-2 border-b border-slate-800">
        <div>TIME</div>
        <div>SIDE / PRICE</div>
        <div className="text-right">SIZE</div>
        <div className="text-right">LATENCY</div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 py-1 pr-1 font-mono text-xs max-h-72">
        {displayTrades.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-xs">Waiting for order fills...</div>
        ) : (
          displayTrades.map((t, idx) => (
            <div key={`${t.id}-${idx}`} className="grid grid-cols-4 items-center py-1.5 px-2 hover:bg-darkBg rounded border border-transparent hover:border-borderDark transition-all">
              <span className="text-slate-400 text-[11px]">{t.timestamp || 'Just Now'}</span>
              <span className={`font-bold flex items-center gap-1 ${t.side === 'BUY' ? 'text-bidGreen' : 'text-askRed'}`}>
                {t.side === 'BUY' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                ${t.price.toFixed(2)}
              </span>
              <span className="text-right text-slate-200">{t.qty}</span>
              <span className="text-right text-slate-400 text-[11px]">{t.latency_us ? t.latency_us.toFixed(1) : 0.8} μs</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
