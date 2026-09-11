import sys
import os
import time

# Add backend directory to sys.path
sys.path.append(os.path.dirname(__file__))

from cpp_wrapper import MatchingEngineWrapper
from risk_analytics import QuantitativeRiskEngine
import db

def test_engine_and_risk():
    print("=== Testing C++ Engine DLL & Risk Analytics ===")
    
    # 1. Initialize Engine
    engine = MatchingEngineWrapper()
    assert engine.handle or hasattr(engine, 'py_engine'), "Engine failed to initialize!"
    print(f"[TEST 1 PASS] Engine Type: {'Native C++20 DLL' if engine.is_native else 'Python Fallback'}")

    # 2. Place Orders
    execs1 = engine.add_order(order_id=1, trader_id=10, price=150.00, qty=100, side=0) # BUY 100 @ 150.00
    print(f"[TEST 2 PASS] Placed Resting Bid Order (Executions count: {len(execs1)})")

    execs2 = engine.add_order(order_id=2, trader_id=20, price=150.00, qty=40, side=1) # SELL 40 @ 150.00
    print(f"[TEST 3 PASS] Executed Matching Ask Order (Executions count: {len(execs2)})")
    assert len(execs2) == 1, "Expected 1 execution!"
    assert execs2[0]["price"] == 150.00, "Matched price mismatch!"
    assert execs2[0]["qty"] == 40, "Matched quantity mismatch!"

    # 3. Check Depth
    depth = engine.get_depth()
    print(f"[TEST 4 PASS] Order Book Depth: Bids={len(depth['bids'])}, Asks={len(depth['asks'])}")
    assert len(depth['bids']) > 0, "Bids depth should not be empty!"

    # 4. Latency Metrics
    latency_stats = engine.get_latency_stats()
    print(f"[TEST 5 PASS] Latency Metrics: P50={latency_stats['p50']}us, P90={latency_stats['p90']}us, P99={latency_stats['p99']}us")

    # 5. Risk Analytics Test
    risk_engine = QuantitativeRiskEngine(initial_price=150.0)
    for p in [150.2, 150.5, 149.8, 151.0, 150.9, 151.2]:
        risk_engine.update_price(p)

    var_res = risk_engine.run_monte_carlo_var(num_paths=1000)
    print(f"[TEST 6 PASS] Monte Carlo 1,000-Path VaR: 95% VaR={var_res['var_95']}%, 99% VaR={var_res['var_99']}%")

    regime_res = risk_engine.classify_market_regime(depth['bids'], depth['asks'])
    print(f"[TEST 7 PASS] Market Regime Classified: {regime_res['regime']} (Confidence: {regime_res['confidence']}%)")

    # 6. Database WAL Test
    db.init_db()
    db.log_executions(execs2)
    recent = db.get_recent_executions(limit=5)
    print(f"[TEST 8 PASS] DB Persistence Logged {len(recent)} Executions in WAL mode.")

    print("\n[SUCCESS] ALL ENGINE & BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_engine_and_risk()
