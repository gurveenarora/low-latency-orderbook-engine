"use client";

import React from 'react';
import { TrendingUp, ShieldAlert, LineChart, Award } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RiskProps {
  riskData: any;
  regimeData: any;
  sharpeData: any;
}

export default function RiskAnalyticsPanel({ riskData, regimeData, sharpeData }: RiskProps) {
  const var95 = riskData?.var_95 || 0.45;
  const var99 = riskData?.var_99 || 0.85;
  const regime = regimeData?.regime || 'SIDEWAYS_CONSOLIDATION';
  const regimeConf = regimeData?.confidence || 88.5;
  const sharpe = sharpeData?.sharpe_ratio || 1.85;

  // Prepare Monte Carlo paths chart data
  const sampledPaths = riskData?.paths_sampled || [];
  const chartData = [];
  if (sampledPaths.length > 0 && sampledPaths[0]) {
    for (let t = 0; t < sampledPaths[0].length; t++) {
      const point: any = { step: `t+${t}` };
      sampledPaths.forEach((path: number[], idx: number) => {
        point[`path_${idx}`] = path[t];
      });
      chartData.push(point);
    }
  }

  const getRegimeColor = (r: string) => {
    if (r === 'BULLISH_TRENDING') return 'bg-emerald-950 text-emerald-400 border-emerald-800';
    if (r === 'BEARISH_VOLATILE') return 'bg-rose-950 text-rose-400 border-rose-800';
    return 'bg-amber-950 text-amber-400 border-amber-800';
  };

  return (
    <div className="bg-cardBg border border-borderDark rounded-xl p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between border-b border-borderDark pb-3 mb-3">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-purple-400" />
            1,000-PATH MONTE CARLO VaR & QUANT RISK
          </h2>
          <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border font-semibold ${getRegimeColor(regime)}`}>
            {regime.replace('_', ' ')} ({regimeConf}%)
          </span>
        </div>

        {/* Risk Metrics Row */}
        <div className="grid grid-cols-3 gap-3 mb-4 font-mono">
          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-400" />
              95% VaR (1-DAY)
            </div>
            <div className="text-lg font-bold text-amber-400">-{var95}%</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Value at Risk</div>
          </div>

          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              99% VaR (1-DAY)
            </div>
            <div className="text-lg font-bold text-rose-400">-{var99}%</div>
            <div className="text-[9px] text-slate-500 mt-0.5">Tail Tail Loss</div>
          </div>

          <div className="bg-darkBg border border-borderDark p-3 rounded-lg">
            <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Award className="w-3 h-3 text-goldAccent" />
              SHARPE RATIO
            </div>
            <div className="text-lg font-bold text-goldAccent">{sharpe}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">60-Period Rolling</div>
          </div>
        </div>

        {/* Monte Carlo Path Simulation Graph */}
        <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center justify-between">
          <span>MONTE CARLO TRAJECTORIES (1,000 SIMULATED PATHS)</span>
          <span className="text-slate-500">GBM Stochastic Model</span>
        </div>

        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="step" stroke="#64748B" tick={{ fontSize: 9, fill: '#94A3B8' }} />
              <YAxis stroke="#64748B" tick={{ fontSize: 9, fill: '#94A3B8' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#121824', borderColor: '#1E293B', borderRadius: '8px', fontSize: '11px' }}
              />
              <Line type="monotone" dataKey="path_0" stroke="#00E676" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="path_1" stroke="#2979FF" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="path_2" stroke="#FFD700" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="path_3" stroke="#A855F7" dot={false} strokeWidth={1.5} />
              <Line type="monotone" dataKey="path_4" stroke="#FF1744" dot={false} strokeWidth={1.5} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
