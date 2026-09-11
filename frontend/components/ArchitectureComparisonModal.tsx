"use client";

import React from 'react';
import { X, ShieldCheck, Star } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArchitectureComparisonModal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-cardBg border border-borderDark rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-darkBg border border-borderDark"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 border border-blue-500/40 rounded-xl text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Production Systems Engineering & HFT Benchmarks
            </h2>
            <p className="text-xs text-slate-400">High-Frequency Trading Engine Design vs Standard Web/DB Infrastructure</p>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-hidden border border-borderDark rounded-xl mb-6">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-darkBg text-slate-400 border-b border-borderDark">
                <th className="p-3">System Component</th>
                <th className="p-3 text-rose-400">Standard Web/DB Architecture</th>
                <th className="p-3 text-emerald-400">Apex-Quant Production Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderDark text-slate-300">
              <tr className="hover:bg-darkBg/50">
                <td className="p-3 font-semibold text-white">Memory Allocation</td>
                <td className="p-3 text-slate-400">Dynamic <code className="bg-darkBg px-1 py-0.5 rounded text-rose-300">malloc</code> / <code class="bg-darkBg px-1 py-0.5 rounded text-rose-300">new</code> calls per order (causes OS allocation & GC latency spikes).</td>
                <td className="p-3 text-emerald-300 font-semibold bg-emerald-950/20">Pre-allocated C++20 <code class="bg-darkBg px-1 py-0.5 rounded text-emerald-400">ObjectPool&lt;T&gt;</code> memory arena for zero runtime OS heap allocations.</td>
              </tr>
              <tr className="hover:bg-darkBg/50">
                <td className="p-3 font-semibold text-white">Order Cancellations</td>
                <td className="p-3 text-slate-400">Sequential loop iteration through order queues (<span className="text-rose-400 font-bold">O(N) latency growth</span>).</td>
                <td className="p-3 text-emerald-300 font-semibold bg-emerald-950/20">Associative hash map lookup (<code class="bg-darkBg px-1 py-0.5 rounded text-emerald-400">std::unordered_map</code>) for instant <span className="text-emerald-400 font-bold">O(1) un-linking</span>.</td>
              </tr>
              <tr className="hover:bg-darkBg/50">
                <td className="p-3 font-semibold text-white">Pipeline Latency</td>
                <td className="p-3 text-slate-400">Direct HTTP polling or synchronous database writes.</td>
                <td className="p-3 text-emerald-300 font-semibold bg-emerald-950/20">Asynchronous non-blocking message broker pipeline & 15ms WebSockets smooth out volume spikes.</td>
              </tr>
              <tr className="hover:bg-darkBg/50">
                <td className="p-3 font-semibold text-white">State Persistence</td>
                <td className="p-3 text-slate-400">Blocking relational table writes or flat file logs.</td>
                <td className="p-3 text-emerald-300 font-semibold bg-emerald-950/20">Key-value snapshots & execution logs stored in SQLite WAL (Write-Ahead Logging) mode.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quant & HFT Features Highlight */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-darkBg border border-borderDark p-4 rounded-xl">
            <h4 className="text-xs font-bold text-accentBlue mb-1">0-Allocation Memory Arena</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-allocated contiguous memory pools avoid OS kernel memory allocations during peak market volatility windows.
            </p>
          </div>
          <div className="bg-darkBg border border-borderDark p-4 rounded-xl">
            <h4 className="text-xs font-bold text-purple-400 mb-1">Stochastic Monte Carlo Engine</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Geometric Brownian Motion engine simulating 1,000 future price trajectories live for 95% & 99% VaR.
            </p>
          </div>
          <div className="bg-darkBg border border-borderDark p-4 rounded-xl">
            <h4 className="text-xs font-bold text-amber-400 mb-1">Hardware Latency Tail Diagnostics</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              High-resolution nanosecond timer metrics measuring microsecond execution distributions (P50, P90, P99).
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-accentBlue hover:bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
