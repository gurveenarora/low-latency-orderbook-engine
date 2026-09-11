"use client";

import React, { useState } from 'react';
import { Send, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface OrderFormProps {
  midPrice: number;
  onOrderSubmitted: () => void;
}

export default function OrderForm({ midPrice, onOrderSubmitted }: OrderFormProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState<string>(midPrice.toFixed(2));
  const [qty, setQty] = useState<string>('100');
  const [cancelId, setCancelId] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg(null);

    const orderPrice = orderType === 'MARKET'
      ? (side === 'BUY' ? midPrice + 0.10 : midPrice - 0.10)
      : parseFloat(price);

    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: orderPrice,
          qty: parseInt(qty, 10),
          side: side === 'BUY' ? 0 : 1,
          trader_id: 202
        })
      });

      const data = await res.json();
      if (data.status === 'ACCEPTED') {
        const fills = data.executions?.length || 0;
        setStatusMsg({
          type: 'success',
          text: fills > 0
            ? `Order #${data.order_id} MATCHED (${fills} fills in microsecond engine)`
            : `Order #${data.order_id} Resting in Book (O(1) Memory Array)`
        });
        onOrderSubmitted();
      } else {
        setStatusMsg({ type: 'error', text: 'Order submission failed.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Network / Server Error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try {
      const res = await fetch(`/api/cancel/${cancelId}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setStatusMsg({ type: 'success', text: `O(1) Instant Cancelled Order #${cancelId}` });
        setCancelId('');
        onOrderSubmitted();
      } else {
        setStatusMsg({ type: 'error', text: `Order #${cancelId} not found in active memory map.` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to cancel order' });
    }
  };

  return (
    <div className="bg-cardBg border border-borderDark rounded-xl p-4 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-sm font-bold text-slate-200 border-b border-borderDark pb-3 mb-4 flex items-center justify-between">
          <span>ORDER ENTRY TERMINAL</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
            O(1) Map Hash Lookup
          </span>
        </h2>

        {/* Side Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded-lg font-bold text-xs transition-all ${
              side === 'BUY'
                ? 'bg-bidGreen text-slate-950 shadow-md shadow-emerald-950'
                : 'bg-darkBg text-slate-400 hover:text-white border border-borderDark'
            }`}
          >
            BUY / BID
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded-lg font-bold text-xs transition-all ${
              side === 'SELL'
                ? 'bg-askRed text-white shadow-md shadow-rose-950'
                : 'bg-darkBg text-slate-400 hover:text-white border border-borderDark'
            }`}
          >
            SELL / ASK
          </button>
        </div>

        {/* Order Type Toggle */}
        <div className="flex bg-darkBg border border-borderDark rounded-lg p-1 mb-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`flex-1 py-1 text-center rounded ${orderType === 'LIMIT' ? 'bg-borderDark text-white font-bold' : 'text-slate-400'}`}
          >
            LIMIT ORDER
          </button>
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`flex-1 py-1 text-center rounded ${orderType === 'MARKET' ? 'bg-borderDark text-white font-bold' : 'text-slate-400'}`}
          >
            MARKET ORDER
          </button>
        </div>

        {/* Order Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-slate-400 mb-1">LIMIT PRICE ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-darkBg border border-borderDark rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accentBlue"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1">QUANTITY (SHARES)</label>
            <input
              type="number"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-darkBg border border-borderDark rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-accentBlue"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              side === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'SUBMITTING TO C++ ENGINE...' : `SUBMIT ${side} ${orderType}`}
          </button>
        </form>

        {/* Instant Status Feedback */}
        {statusMsg && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs flex items-start gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border border-rose-800 text-rose-300'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{statusMsg.text}</span>
          </div>
        )}
      </div>

      {/* O(1) Instant Order Cancel Trigger */}
      <div className="pt-4 border-t border-borderDark mt-4">
        <label className="block text-[11px] font-mono text-slate-400 mb-1">O(1) INSTANT ORDER CANCELLATION</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Order ID #"
            value={cancelId}
            onChange={(e) => setCancelId(e.target.value)}
            className="flex-1 bg-darkBg border border-borderDark rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
          />
          <button
            type="button"
            onClick={handleCancel}
            className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" />
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
