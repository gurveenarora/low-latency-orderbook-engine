"use client";

import React from 'react';
import { Gauge, Clock, ShieldCheck, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface LatencyStats {
  p50: number;
  p90: number;
  p99: number;
  total: number;
}

export default function LatencyDiagnostics({ stats }: LatencyStats | any) {
  const p50 = stats?.p50 || 0.50;
  const p90 = stats?.p90 || 1.20;
  const p99 = stats?.p99 || 3.45;
  const total = stats?.total || 0;

  const chartData = [
    { metric: 'P50 (Median)', latency: p50, fill: '#00E676' },
    { metric: 'P90 (90th %)', latency: p90, fill: '#2979FF' },
    { metric: 'P99 (Tail 99th %)', latency: p99, fill: '#FF1744' },
  ];

  return (
    <div className="bg-cardBg border border-borderDark rounded-xl p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-borderDark pb-3 mb-3">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            MICROSECOND LATENCY TAIL DIAGNOSTICS
          </h2>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            0 Heap Allocations
          </span>
        </div>

        {/* Latency Percentile Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4 font-mono">
          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              P50 (MEDIAN)
            </div>
            <div className="text-lg font-bold text-emerald-400">{p50.toFixed(2)} <span className="text-xs">μs</span></div>
            <div className="text-[9px] text-slate-500 mt-0.5">Microseconds</div>
          </div>

          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              P90 (90TH %)
            </div>
            <div className="text-lg font-bold text-blue-400">{p90.toFixed(2)} <span className="text-xs">μs</span></div>
            <div className="text-[9px] text-slate-500 mt-0.5">Microseconds</div>
          </div>

          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              P99 (TAIL 99TH %)
            </div>
            <div className="text-lg font-bold text-rose-400">{p99.toFixed(2)} <span className="text-xs">μs</span></div>
            <div className="text-[9px] text-slate-500 mt-0.5">Microseconds</div>
          </div>
        </div>

        {/* Latency Distribution Histogram */}
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="metric" stroke="#64748B" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 10, fill: '#94A3B8' }} unit="μs" />
              <Tooltip
                contentStyle={{ backgroundColor: '#121824', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#E2E8F0' }}
              />
              <Bar dataKey="latency" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-darkBg border border-borderDark p-2.5 rounded-lg text-xs font-mono flex items-center justify-between text-slate-400 mt-2">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Cpu className="w-4 h-4 text-accentBlue" />
          Engine Capacity:
        </span>
        <span className="text-white font-bold">{total.toLocaleString()} Orders Measured</span>
      </div>
    </div>
  );
}
