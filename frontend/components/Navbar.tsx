"use client";

import React, { useState } from 'react';
import { Cpu, Zap, ShieldAlert, Activity, Server, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  isConnected: boolean;
  engineType: string;
  onTriggerBurst: () => void;
  isBursting: boolean;
  onOpenInfoModal: () => void;
}

export default function Navbar({
  isConnected,
  engineType,
  onTriggerBurst,
  isBursting,
  onOpenInfoModal
}: NavbarProps) {
  return (
    <header className="bg-cardBg border-b border-borderDark px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-3">
        <div className="bg-accentBlue/20 p-2 rounded-lg border border-accentBlue/40 text-accentBlue">
          <Cpu className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            APEX-QUANT <span className="text-xs px-2 py-0.5 rounded bg-accentBlue/30 text-accentBlue border border-accentBlue/40">C++20 HFT</span>
          </h1>
          <p className="text-xs text-slate-400">Microsecond Order Matching & Monte Carlo Risk Platform</p>
        </div>
      </div>

      {/* Engine Metrics & Badges */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="bg-darkBg border border-borderDark px-3 py-1.5 rounded-md flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400">Core Engine:</span>
          <span className="text-emerald-400 font-bold">{engineType}</span>
        </div>

        <div className="bg-darkBg border border-borderDark px-3 py-1.5 rounded-md flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400">WS Stream:</span>
          <span className="text-blue-400 font-bold">15ms (66 FPS)</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-darkBg border border-borderDark">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
          <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {isConnected ? 'LIVE WEBSOCKET' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenInfoModal}
          className="flex items-center gap-1.5 bg-borderDark/60 hover:bg-borderDark text-slate-200 text-xs px-3 py-2 rounded-lg transition-all border border-slate-700"
        >
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Systems Engineering Benchmarks</span>
        </button>

        <button
          onClick={onTriggerBurst}
          disabled={isBursting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-lg ${
            isBursting
              ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-950/40'
          }`}
        >
          <Zap className={`w-4 h-4 ${isBursting ? 'animate-bounce' : ''}`} />
          {isBursting ? 'SIMULATING 1,000 ORDERS/SEC...' : 'SIMULATE 1,000 ORDERS/SEC BURST'}
        </button>
      </div>
    </header>
  );
}
