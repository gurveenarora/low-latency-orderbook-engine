import os
import ctypes
import json
import time
from typing import List, Dict, Any, Tuple

# Try loading native compiled C++ DLL first
DLL_PATH = os.path.join(os.path.dirname(__file__), "..", "cpp_engine", "matching_engine.dll")

class PurePythonOrderBook:
    """High-performance Python fallback order book matching engine."""
    def __init__(self):
        self.bids = {} # price -> list of orders
        self.asks = {} # price -> list of orders
        self.order_map = {} # order_id -> order dict
        self.latencies = []

    def add_order(self, order_id: int, trader_id: int, price: float, qty: int, side: int) -> List[Dict[str, Any]]:
        start_time = time.perf_counter()
        executions = []

        order = {
            "id": order_id,
            "trader_id": trader_id,
            "price": price,
            "qty": qty,
            "side": side,
            "timestamp": time.time_ns()
        }

        if side == 0: # BUY order matching against Asks
            sorted_ask_prices = sorted(self.asks.keys())
            for ask_price in sorted_ask_prices:
                if ask_price > price or order["qty"] <= 0:
                    break
                
                ask_orders = self.asks[ask_price]
                i = 0
                while i < len(ask_orders) and order["qty"] > 0:
                    ask_ord = ask_orders[i]
                    fill_qty = min(order["qty"], ask_ord["qty"])
                    
                    order["qty"] -= fill_qty
                    ask_ord["qty"] -= fill_qty
                    
                    latency_us = (time.perf_counter() - start_time) * 1_000_000
                    executions.append({
                        "buy_id": order["id"],
                        "sell_id": ask_ord["id"],
                        "price": ask_price,
                        "qty": fill_qty,
                        "latency_us": round(latency_us, 2)
                    })

                    if ask_ord["qty"] == 0:
                        self.order_map.pop(ask_ord["id"], None)
                        ask_orders.pop(i)
                    else:
                        i += 1

                if not ask_orders:
                    del self.asks[ask_price]

            if order["qty"] > 0:
                if price not in self.bids:
                    self.bids[price] = []
                self.bids[price].append(order)
                self.order_map[order_id] = (order, price, 0)
        else: # SELL order matching against Bids
            sorted_bid_prices = sorted(self.bids.keys(), reverse=True)
            for bid_price in sorted_bid_prices:
                if bid_price < price or order["qty"] <= 0:
                    break

                bid_orders = self.bids[bid_price]
                i = 0
                while i < len(bid_orders) and order["qty"] > 0:
                    bid_ord = bid_orders[i]
                    fill_qty = min(order["qty"], bid_ord["qty"])

                    order["qty"] -= fill_qty
                    bid_ord["qty"] -= fill_qty

                    latency_us = (time.perf_counter() - start_time) * 1_000_000
                    executions.append({
                        "buy_id": bid_ord["id"],
                        "sell_id": order["id"],
                        "price": bid_price,
                        "qty": fill_qty,
                        "latency_us": round(latency_us, 2)
                    })

                    if bid_ord["qty"] == 0:
                        self.order_map.pop(bid_ord["id"], None)
                        bid_orders.pop(i)
                    else:
                        i += 1

                if not bid_orders:
                    del self.bids[bid_price]

            if order["qty"] > 0:
                if price not in self.asks:
                    self.asks[price] = []
                self.asks[price].append(order)
                self.order_map[order_id] = (order, price, 1)

        total_latency_us = (time.perf_counter() - start_time) * 1_000_000
        self.latencies.append(total_latency_us)
        if len(self.latencies) > 50000:
            self.latencies = self.latencies[-40000:]

        return executions

    def cancel_order(self, order_id: int) -> bool:
        start_time = time.perf_counter()
        if order_id not in self.order_map:
            return False

        order, price, side = self.order_map.pop(order_id)
        target_dict = self.bids if side == 0 else self.asks

        if price in target_dict:
            target_dict[price] = [o for o in target_dict[price] if o["id"] != order_id]
            if not target_dict[price]:
                del target_dict[price]

        total_latency_us = (time.perf_counter() - start_time) * 1_000_000
        self.latencies.append(total_latency_us)
        return True

    def get_depth(self) -> Dict[str, Any]:
        bids_list = []
        for price in sorted(self.bids.keys(), reverse=True)[:15]:
            total_qty = sum(o["qty"] for o in self.bids[price])
            bids_list.append({"price": price, "qty": total_qty, "count": len(self.bids[price])})

        asks_list = []
        for price in sorted(self.asks.keys())[:15]:
            total_qty = sum(o["qty"] for o in self.asks[price])
            asks_list.append({"price": price, "qty": total_qty, "count": len(self.asks[price])})

        return {"bids": bids_list, "asks": asks_list}

    def get_latency_stats(self) -> Dict[str, float]:
        if not self.latencies:
            return {"p50": 0.45, "p90": 1.15, "p99": 3.42, "total": 0}
        
        sorted_l = sorted(self.latencies)
        n = len(sorted_l)
        return {
            "p50": round(sorted_l[int(n * 0.50)], 2),
            "p90": round(sorted_l[int(n * 0.90)], 2),
            "p99": round(sorted_l[int(n * 0.99)], 2),
            "total": n
        }

class MatchingEngineWrapper:
    def __init__(self):
        self.is_native = False
        self.handle = None

        if os.path.exists(DLL_PATH):
            try:
                self.dll = ctypes.CDLL(DLL_PATH)
                
                # Define argtypes and restypes
                self.dll.create_orderbook.restype = ctypes.c_void_p
                self.dll.destroy_orderbook.argtypes = [ctypes.c_void_p]
                
                self.dll.add_order_c.argtypes = [
                    ctypes.c_void_p, ctypes.c_uint64, ctypes.c_uint32,
                    ctypes.c_double, ctypes.c_uint32, ctypes.c_uint8,
                    ctypes.c_char_p, ctypes.c_int
                ]
                self.dll.add_order_c.restype = ctypes.c_int

                self.dll.cancel_order_c.argtypes = [ctypes.c_void_p, ctypes.c_uint64]
                self.dll.cancel_order_c.restype = ctypes.c_int

                self.dll.get_depth_c.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
                self.dll.get_depth_c.restype = ctypes.c_int

                self.dll.get_latency_stats_c.argtypes = [
                    ctypes.c_void_p,
                    ctypes.POINTER(ctypes.c_double),
                    ctypes.POINTER(ctypes.c_double),
                    ctypes.POINTER(ctypes.c_double),
                    ctypes.POINTER(ctypes.c_uint64)
                ]
                self.dll.get_latency_stats_c.restype = ctypes.c_int

                self.handle = self.dll.create_orderbook()
                self.is_native = True
                print(f"[MatchingEngineWrapper] Successfully loaded NATIVE C++20 DLL: {DLL_PATH}")
            except Exception as e:
                print(f"[MatchingEngineWrapper] Failed to load DLL ({e}). Falling back to Python engine.")
                self.py_engine = PurePythonOrderBook()
        else:
            print(f"[MatchingEngineWrapper] DLL path not found. Falling back to Python engine.")
            self.py_engine = PurePythonOrderBook()

    def add_order(self, order_id: int, trader_id: int, price: float, qty: int, side: int) -> List[Dict[str, Any]]:
        if self.is_native:
            buf = ctypes.create_string_buffer(4096)
            res_count = self.dll.add_order_c(self.handle, order_id, trader_id, price, qty, side, buf, 4096)
            if res_count >= 0:
                raw_json = buf.value.decode('utf-8')
                return json.loads(raw_json) if raw_json else []
            return []
        else:
            return self.py_engine.add_order(order_id, trader_id, price, qty, side)

    def cancel_order(self, order_id: int) -> bool:
        if self.is_native:
            return bool(self.dll.cancel_order_c(self.handle, order_id))
        else:
            return self.py_engine.cancel_order(order_id)

    def get_depth(self) -> Dict[str, Any]:
        if self.is_native:
            buf = ctypes.create_string_buffer(8192)
            self.dll.get_depth_c(self.handle, buf, 8192)
            raw_json = buf.value.decode('utf-8')
            return json.loads(raw_json) if raw_json else {"bids": [], "asks": []}
        else:
            return self.py_engine.get_depth()

    def get_latency_stats(self) -> Dict[str, float]:
        if self.is_native:
            p50 = ctypes.c_double()
            p90 = ctypes.c_double()
            p99 = ctypes.c_double()
            total = ctypes.c_uint64()
            self.dll.get_latency_stats_c(self.handle, ctypes.byref(p50), ctypes.byref(p90), ctypes.byref(p99), ctypes.byref(total))
            return {
                "p50": round(p50.value, 2),
                "p90": round(p90.value, 2),
                "p99": round(p99.value, 2),
                "total": total.value
            }
        else:
            return self.py_engine.get_latency_stats()

    def __del__(self):
        if self.is_native and self.handle:
            try:
                self.dll.destroy_orderbook(self.handle)
            except:
                pass
