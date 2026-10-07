# Low-Latency C++20 Order Book Matching Engine & Microstructure Risk Platform

[![C++20 Core](https://img.shields.io/badge/C%2B%2B-20%20Standard-blue.svg?style=flat-square&logo=cplusplus)](https://en.cppreference.com/w/cpp/20)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![WebSockets](https://img.shields.io/badge/Streaming-15ms%20WebSockets-000000.svg?style=flat-square&logo=websocket)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Containerized-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

A high-performance C++20 limit order book matching engine connected to a FastAPI backend and real-time quantitative risk analytics dashboard.

---

## ⚡ Core Technical Features & Architecture

### 1. C++20 Order Book Engine
- **Pre-Allocated Memory Pool (`ObjectPool<T>`):** Pre-allocates order structures (`Order`) in contiguous memory arenas to avoid `new`/`delete` overhead per order node.
- **Cache Line Alignment (`alignas(64)`):** Aligns `Order` struct definitions to 64-byte L1 cache lines to minimize cache line splitting and maximize L1/L2 cache efficiency.
- **$O(1)$ Intrusive Order Cancellations:** Uses an `std::unordered_map` index combined with intrusive doubly-linked list pointers (`prev`/`next`) for constant-time order lookup and queue removal.
- **Microsecond Latency Diagnostics:** Benchmarked on local hardware at **$P_{50} = 0.20\,\mu\text{s}$** median and **$P_{99} = 0.70\,\mu\text{s}$** tail latency over 100,000 processed orders.

### 2. Market Microstructure & Execution Analytics
- **Stoikov Micro-Price Model:** Computes volume-weighted mid-price to capture short-term order book imbalance:
  $$P_{\text{Micro}} = P_{\text{bid}} \left(\frac{V_{\text{ask}}}{V_{\text{bid}} + V_{\text{ask}}}\right) + P_{\text{ask}} \left(\frac{V_{\text{bid}}}{V_{\text{bid}} + V_{\text{ask}}}\right)$$
- **VPIN-Style Depth Imbalance Proxy:** Calculates top-of-book volume imbalance ($\frac{|V_{\text{bid}} - V_{\text{ask}}|}{V_{\text{bid}} + V_{\text{ask}}}$) as an indicator of directional order flow pressure.
- **Order Flow Imbalance (OFI):** Tracks multi-level order book liquidity delta ($\text{OFI}_t = \Delta L_t^{\text{bid}} - \Delta L_t^{\text{ask}}$).
- **Avellaneda-Stoikov Reservation Price Skew:** Evaluates inventory risk skew:
  $$r(s, q, \gamma, \sigma, t) = s - q \cdot \gamma \cdot \sigma^2 \cdot (T - t)$$
- **Implementation Shortfall Analytics:** Measures execution slippage in basis points ($\text{bps}$) relative to arrival mid-price.

### 3. Quantitative Risk & Volatility Diagnostics
- **1,000-Path Monte Carlo Simulation:** Simulates Geometric Brownian Motion (GBM) price trajectories for 1-day 95% and 99% Value-at-Risk (VaR).
- **GARCH(1,1) Volatility Forecasting:** Computes dynamic conditional variance ($\sigma_t^2 = \omega + \alpha \epsilon_{t-1}^2 + \beta \sigma_{t-1}^2$) for forward volatility estimates.
- **Market Regime Classification:** Categorizes live market state into Bullish Trending, Bearish Volatile, or Sideways Consolidation.

### 4. Interactive Web Terminal UI
- Clean dark theme dashboard (`#0B0F19` slate background).
- 15ms WebSocket tick stream rendering Level 2 order depth, Chart.js Monte Carlo trajectories, microsecond latency percentiles, and live trade tape.

---

## 📊 Architecture Comparison

| Engineering Metric | Standard Implementation | Apex-Quant Engine |
| :--- | :--- | :--- |
| **Order Memory** | Dynamic `new` per order node | Pre-allocated C++20 `ObjectPool<T>` with `alignas(64)` |
| **Order Cancellation** | $O(N)$ queue search | $O(1)$ hashtable lookup + doubly-linked list unlink |
| **Data Pipeline** | Synchronous REST polling | Asynchronous queue broker & 15ms WebSocket stream |
| **Risk Metrics** | End-of-day batch reports | Real-time VPIN-style imbalance, OFI, Stoikov Micro-Price, Monte Carlo VaR |

---

## 🛠️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       C++20 NATIVE MATCHING ENGINE      │
                               │  (alignas(64) ObjectPool, O(1) Cancel)  │
                               └────────────────────┬────────────────────┘
                                                    │ (C-ABI CTypes Bridge)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │        PYTHON FASTAPI BACKEND           │
                               │  - Async Message Broker Queue           │
                               │  - Monte Carlo VaR & GARCH(1,1) Vol    │
                               │  - VPIN-Style Imbalance & Micro-Price   │
                               └────────────────────┬────────────────────┘
                                                    │ (15ms WSS Tick Stream)
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       REAL-TIME WEB DASHBOARD           │
                               │  - Level 2 Depth Order Ladder           │
                               │  - Stoikov Micro-Price & Slippage (bps) │
                               │  - Live Trade Tape & Latency Metrics    │
                               └─────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
├── cpp_engine/
│   ├── OrderPool.hpp         # Cache-aligned alignas(64) object pool memory arena
│   ├── OrderBook.hpp         # O(1) intrusive limit order book matching logic
│   ├── bench.cpp             # Benchmark harness for throughput, latency & allocations
│   ├── c_api.cpp             # C-ABI export layer for CTypes dynamic bridge
│   └── build.bat             # MSVC C++20 compilation script
├── backend/
│   ├── main.py               # FastAPI application & WebSocket broadcast loop
│   ├── cpp_wrapper.py        # CTypes dynamic wrapper with Python fallback
│   ├── risk_analytics.py     # Monte Carlo VaR, VPIN-style proxy, OFI & GARCH
│   ├── message_broker.py     # Asynchronous non-blocking message queue
│   ├── db.py                 # SQLite WAL mode persistence layer
│   └── static/
│       └── index.html        # Real-time web dashboard
├── Dockerfile                # Multi-stage Docker build container
├── render.yaml               # Cloud deployment manifest
├── requirements.txt          # Python dependencies
├── LICENSE                   # MIT License
└── README.md                 # Project documentation
```

---

## ⚠️ Known Limitations & Trade-offs

1. **Heap Allocation Overhead:** While individual `Order` structs are served from a pre-allocated `ObjectPool`, `std::map` (used for ordered price levels), `std::unordered_map` (used for order ID lookups), and dynamic `std::vector` return objects perform heap allocations (~1.45 allocs/order under benchmark load).
2. **Floating-Point Price Keys:** Prices are stored as `double`, which can introduce floating-point precision/rounding trade-offs compared to fixed-point integer tick representation (`int64_t`).
3. **Single-Threaded Engine Core:** The matching engine core is non-thread-safe and runs on a single thread. Multithreaded producers must synchronize access via an external lock or message broker queue.

---

## 💻 Quickstart & Local Setup

### Prerequisites
- **C++ Compiler:** MSVC (Visual Studio 2022) on Windows OR `g++` (GCC 11+) on Linux/macOS.
- **Python:** `3.11+`

### 1. Build C++ Shared Library
```bash
# Windows (MSVC)
cd cpp_engine
build.bat

# Linux / macOS (GCC)
g++ -O2 -std=c++20 -shared -fPIC c_api.cpp -o matching_engine.so
```

### 2. Run Latency & Allocation Benchmark
```bash
# Windows (MSVC)
cd cpp_engine
cl /O2 /std:c++20 /EHsc bench.cpp /Fe:bench.exe
bench.exe

# Linux / macOS (GCC)
cd cpp_engine
g++ -O2 -std=c++20 bench.cpp -o bench
./bench
```

### 3. Start Platform Backend Server
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run FastAPI server
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080
```
Open **`http://localhost:8080`** in your browser.

---

## 📈 Latency Benchmarks

Measured on local hardware over 100,000 order insertions, matches, and cancellations:

- **Median Latency ($P_{50}$):** `0.20 µs`
- **90th Percentile ($P_{90}$):** `0.30 µs`
- **Tail Latency ($P_{99}$):** `0.70 µs`
- **Allocations per Order:** `1.45`
- **Throughput Capability:** `3,800,000+ orders/sec`

---

## 📜 License
Distributed under the **MIT License**. See `LICENSE` for details.
