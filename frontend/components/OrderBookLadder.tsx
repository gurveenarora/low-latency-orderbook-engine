"use client";

import React from 'react';
import { Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DepthItem {
  price: number;
  qty: number;
  count: number;
}

interface OrderBookProps {
  bids: DepthItem[];
  asks: DepthItem[];
  midPrice: number;
  spread: number;
}

export default function OrderBookLadder({ bids, asks, midPrice, spread }: OrderBookProps) {
  const maxBidQty = Math.max(...bids.map(b => b.qty), 100);
  const maxAskQty = Math.max(...asks.map(a => a.qty), 100);

  // Take top 8 asks (reversed for display) and top 8 bids
  const displayAsks = [...asks].slice(0, 8).reverse();
  const displayBids = [...bids].slice(0, 8);

  return (
    <div className="bg-cardBg border border-borderDark rounded-xl p-4 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-borderDark pb-3 mb-3">
        <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-accentBlue" />
          LEVEL 2 ORDER BOOK DEPTH
        </h2>
        <div className="text-xs font-mono text-slate-400">
          Spread: <span className="text-amber-400 font-semibold">${spread.toFixed(2)}</span>
        </div>
      </div>

      {/* Depth Table Header */}
      <div className="grid grid-cols-3 text-[11px] font-mono text-slate-400 pb-2 px-2 border-b border-slate-800">
        <div>PRICE ($)</div>
        <div className="text-right">SIZE (QTY)</div>
        <div className="text-right">ORDERS</div>
      </div>

      {/* ASKS (SELL ORDERS) */}
      <div className="flex-1 overflow-hidden space-y-0.5 py-1">
        {displayAsks.map((ask, i) => {
          const depthPct = Math.min(100, (ask.qty / maxAskQty) * 100);
          return (
            <div key={`ask-${i}`} className="relative grid grid-cols-3 text-xs font-mono py-1 px-2 hover:bg-rose-950/20 rounded">
              {/* Depth fill background */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-askRed font-bold flex items-center gap-1 z-10">
                {ask.price.toFixed(2)}
                <ArrowUpRight className="w-3 h-3 text-askRed opacity-70" />
              </span>
              <span className="text-right text-slate-200 z-10">{ask.qty.toLocaleString()}</span>
              <span className="text-right text-slate-400 z-10">{ask.count}</span>
            </div>
          );
        })}
      </div>

      {/* MID PRICE BANNER */}
      <div className="bg-darkBg border-y border-borderDark py-2 px-4 my-2 flex items-center justify-between rounded">
        <span className="text-xs font-mono text-slate-400">MID-MARKET PRICE:</span>
        <span className="text-base font-bold font-mono text-goldAccent flex items-center gap-1">
          ${midPrice.toFixed(2)}
        </span>
      </div>

      {/* BIDS (BUY ORDERS) */}
      <div className="flex-1 overflow-hidden space-y-0.5 py-1">
        {displayBids.map((bid, i) => {
          const depthPct = Math.min(100, (bid.qty / maxBidQty) * 100);
          return (
            <div key={`bid-${i}`} className="relative grid grid-cols-3 text-xs font-mono py-1 px-2 hover:bg-emerald-950/20 rounded">
              {/* Depth fill background */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded"
                style={{ width: `${depthPct}%` }}
              />
              <span className="text-bidGreen font-bold flex items-center gap-1 z-10">
                {bid.price.toFixed(2)}
                <ArrowDownRight className="w-3 h-3 text-bidGreen opacity-70" />
              </span>
              <span className="text-right text-slate-200 z-10">{bid.qty.toLocaleString()}</span>
              <span className="text-right text-slate-400 z-10">{bid.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
