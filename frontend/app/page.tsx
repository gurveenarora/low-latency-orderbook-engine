"use client";

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import OrderBookLadder from '@/components/OrderBookLadder';
import OrderForm from '@/components/OrderForm';
import LatencyDiagnostics from '@/components/LatencyDiagnostics';
import RiskAnalyticsPanel from '@/components/RiskAnalyticsPanel';
import TradeTape from '@/components/TradeTape';
import ArchitectureComparisonModal from '@/components/ArchitectureComparisonModal';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [engineType, setEngineType] = useState('Native C++20 (MSVC)');
  const [depth, setDepth] = useState<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });
  const [risk, setRisk] = useState<any>(null);
  const [regime, setRegime] = useState<any>(null);
  const [sharpe, setSharpe] = useState<any>(null);
  const [latency, setLatency] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [isBursting, setIsBursting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const connectWebSocket = () => {
    // Dynamic WebSocket host resolution (works locally, over network IP, or public tunnels)
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = `ws://${host}:8000/ws/market-data`;

    console.log(`[WebSocket] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected successfully!');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.depth) setDepth(data.depth);
        if (data.risk) setRisk(data.risk);
        if (data.regime) setRegime(data.regime);
        if (data.sharpe) setSharpe(data.sharpe);
        if (data.latency) setLatency(data.latency);
        if (data.trades) setTrades(data.trades);
        if (data.engine_type) setEngineType(data.engine_type);
      } catch (err) {
        console.error('[WebSocket] Message parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[WebSocket] Disconnected. Reconnecting in 2s...');
      setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  };

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleTriggerBurst = async () => {
    setIsBursting(true);
    try {
      await fetch('/api/simulate-burst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_count: 1000, burst_speed_ms: 1 })
      });
    } catch (err) {
      console.error('Burst error:', err);
    } finally {
      setTimeout(() => setIsBursting(false), 2000);
    }
  };

  const midPrice = sharpe?.mid_price || 150.0;
  const spread = sharpe?.bid_ask_spread || 0.10;

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        isConnected={isConnected}
        engineType={engineType}
        onTriggerBurst={handleTriggerBurst}
        isBursting={isBursting}
        onOpenInfoModal={() => setIsModalOpen(true)}
      />

      {/* Dashboard Main Grid */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Order Book Depth Ladder (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <OrderBookLadder
            bids={depth.bids}
            asks={depth.asks}
            midPrice={midPrice}
            spread={spread}
          />
        </div>

        {/* Center Column: Order Form & Risk Analytics (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex-1">
            <RiskAnalyticsPanel
              riskData={risk}
              regimeData={regime}
              sharpeData={sharpe}
            />
          </div>
          <div className="h-72">
            <LatencyDiagnostics stats={latency} />
          </div>
        </div>

        {/* Right Column: Order Entry & Live Trade Tape (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex-1">
            <OrderForm
              midPrice={midPrice}
              onOrderSubmitted={() => {}}
            />
          </div>
          <div className="h-64">
            <TradeTape trades={trades} />
          </div>
        </div>
      </main>

      {/* Architecture Modal */}
      <ArchitectureComparisonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
