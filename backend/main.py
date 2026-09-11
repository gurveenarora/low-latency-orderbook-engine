import asyncio
import json
import random
import time
import os
from typing import Dict, Any, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from cpp_wrapper import MatchingEngineWrapper
from message_broker import AsyncMessageBroker
from risk_analytics import QuantitativeRiskEngine
import db

# Instantiate core system engines
engine = MatchingEngineWrapper()
broker = AsyncMessageBroker()
risk_engine = QuantitativeRiskEngine(initial_price=150.0)

class OrderRequest(BaseModel):
    id: int = 0
    trader_id: int = 101
    price: float
    qty: int
    side: int # 0 = BUY, 1 = SELL

class BurstRequest(BaseModel):
    order_count: int = 500
    burst_speed_ms: int = 2

# Connected WebSocket clients tracking
active_websockets: List[WebSocket] = []
trade_history: List[Dict[str, Any]] = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Message Broker Consumer
    db.init_db()
    
    # Initialize order book with seed depth
    seed_prices_bids = [149.95, 149.90, 149.85, 149.80, 149.75, 149.70, 149.65]
    seed_prices_asks = [150.05, 150.10, 150.15, 150.20, 150.25, 150.30, 150.35]
    
    order_id_counter = 1000
    for p in seed_prices_bids:
        engine.add_order(order_id_counter, 1, p, random.randint(100, 500), 0)
        order_id_counter += 1
    for p in seed_prices_asks:
        engine.add_order(order_id_counter, 2, p, random.randint(100, 500), 1)
        order_id_counter += 1

    consumer_task = asyncio.create_task(broker.start_consumer(engine.add_order))
    broadcaster_task = asyncio.create_task(broadcast_loop())
    
    yield

    # Shutdown
    consumer_task.cancel()
    broadcaster_task.cancel()

app = FastAPI(title="High-Performance Microsecond Order Matching Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Apex-Quant Matching Engine API</h1>"

async def broadcast_loop():
    """15ms High-Frequency WebSocket Broadcasting Loop."""
    order_id_seq = 5000
    while True:
        try:
            await asyncio.sleep(0.015) # 15ms tick (66 FPS updates)
            
            # Periodically add realistic market maker liquidity fluctuations
            if random.random() < 0.35:
                order_id_seq += 1
                side = 0 if random.random() < 0.5 else 1
                base_price = risk_engine.current_price
                price = round(base_price + (random.uniform(-0.50, 0.50) if side == 0 else random.uniform(0.01, 0.50)), 2)
                qty = random.randint(10, 200)
                await broker.publish_order({
                    "id": order_id_seq,
                    "trader_id": 99,
                    "price": price,
                    "qty": qty,
                    "side": side
                })

            depth = engine.get_depth()
            if depth["bids"] and depth["asks"]:
                mid = (depth["bids"][0]["price"] + depth["asks"][0]["price"]) / 2.0
                risk_engine.update_price(mid)

            if active_websockets:
                var_data = risk_engine.run_monte_carlo_var(num_paths=1000, time_steps=20)
                regime_data = risk_engine.classify_market_regime(depth["bids"], depth["asks"])
                sharpe_data = risk_engine.calculate_sharpe_and_spread(depth["bids"], depth["asks"])
                microstructure_data = risk_engine.calculate_vpin_and_ofi(depth["bids"], depth["asks"])
                execution_data = risk_engine.calculate_microprice_and_vwap(depth["bids"], depth["asks"], trade_history)
                latency_data = engine.get_latency_stats()

                payload = {
                    "timestamp": time.time(),
                    "depth": depth,
                    "risk": var_data,
                    "regime": regime_data,
                    "sharpe": sharpe_data,
                    "microstructure": microstructure_data,
                    "execution": execution_data,
                    "latency": latency_data,
                    "trades": trade_history[-30:],
                    "engine_type": "Native C++20 (MSVC)" if engine.is_native else "High-Speed Python Fallback"
                }

                disconnected = []
                for ws in active_websockets:
                    try:
                        await ws.send_json(payload)
                    except Exception:
                        disconnected.append(ws)

                for ws in disconnected:
                    if ws in active_websockets:
                        active_websockets.remove(ws)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[BroadcastLoop] Error: {e}")

@app.websocket("/ws/market-data")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    print(f"[WebSocket] Client connected. Total: {len(active_websockets)}")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
        print(f"[WebSocket] Client disconnected. Remaining: {len(active_websockets)}")

@app.post("/api/order")
async def place_order(order: OrderRequest):
    if order.id == 0:
        order.id = random.randint(10000, 999999)

    executions = engine.add_order(order.id, order.trader_id, order.price, order.qty, order.side)
    
    if executions:
        db.log_executions(executions)
        for exec_item in executions:
            trade_entry = {
                "id": f"{exec_item['buy_id']}-{exec_item['sell_id']}",
                "price": exec_item["price"],
                "qty": exec_item["qty"],
                "side": "BUY" if order.side == 0 else "SELL",
                "latency_us": exec_item.get("latency_us", 0.8),
                "timestamp": time.strftime("%H:%M:%S")
            }
            trade_history.append(trade_entry)
            risk_engine.update_price(exec_item["price"])

    return {
        "status": "ACCEPTED",
        "order_id": order.id,
        "executions": executions,
        "engine": "C++20" if engine.is_native else "Python"
    }

@app.post("/api/cancel/{order_id}")
async def cancel_order(order_id: int):
    success = engine.cancel_order(order_id)
    return {"status": "SUCCESS" if success else "NOT_FOUND", "order_id": order_id}

@app.post("/api/simulate-burst")
async def simulate_burst(req: BurstRequest, background_tasks: BackgroundTasks):
    """Simulates a high-frequency trading burst of orders to benchmark microsecond latency tails."""
    def run_burst():
        base_p = risk_engine.current_price
        for i in range(req.order_count):
            oid = random.randint(1000000, 9999999)
            side = 0 if random.random() < 0.52 else 1
            offset = random.uniform(-0.80, 0.80) if side == 0 else random.uniform(0.01, 0.80)
            price = round(max(10.0, base_p + offset), 2)
            qty = random.randint(10, 500)
            
            execs = engine.add_order(oid, 88, price, qty, side)
            if execs:
                db.log_executions(execs)
                for e in execs:
                    trade_history.append({
                        "id": f"{e['buy_id']}-{e['sell_id']}",
                        "price": e["price"],
                        "qty": e["qty"],
                        "side": "BUY" if side == 0 else "SELL",
                        "latency_us": e.get("latency_us", 0.7),
                        "timestamp": time.strftime("%H:%M:%S")
                    })
                    risk_engine.update_price(e["price"])

    background_tasks.add_task(run_burst)
    return {
        "status": "BURST_STARTED",
        "order_count": req.order_count,
        "message": f"Simulating {req.order_count} high-frequency orders..."
    }

@app.get("/api/depth")
def get_depth():
    return engine.get_depth()

@app.get("/api/latency")
def get_latency():
    return engine.get_latency_stats()

@app.get("/api/risk")
def get_risk():
    depth = engine.get_depth()
    var_data = risk_engine.run_monte_carlo_var(num_paths=1000)
    regime_data = risk_engine.classify_market_regime(depth["bids"], depth["asks"])
    sharpe_data = risk_engine.calculate_sharpe_and_spread(depth["bids"], depth["asks"])
    return {
        "var": var_data,
        "regime": regime_data,
        "sharpe": sharpe_data
    }

@app.get("/api/recent-trades")
def get_trades():
    return db.get_recent_executions(limit=30)
