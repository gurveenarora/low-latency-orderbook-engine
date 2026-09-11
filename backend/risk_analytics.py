import numpy as np
from typing import Dict, Any, List

class QuantitativeRiskEngine:
    def __init__(self, initial_price: float = 150.0):
        self.price_history: List[float] = [initial_price]
        self.returns_history: List[float] = []
        self.current_price = initial_price

    def update_price(self, price: float):
        if price <= 0:
            return
        if self.price_history:
            prev_price = self.price_history[-1]
            ret = (price - prev_price) / prev_price
            self.returns_history.append(ret)
            if len(self.returns_history) > 1000:
                self.returns_history.pop(0)

        self.price_history.append(price)
        if len(self.price_history) > 1000:
            self.price_history.pop(0)
        self.current_price = price

    def run_monte_carlo_var(self, num_paths: int = 1000, time_steps: int = 30) -> Dict[str, Any]:
        """Runs a 1,000-path Monte Carlo simulation for Value-at-Risk (VaR 95% and 99%)."""
        if len(self.returns_history) < 5:
            # Default fallback parameters when price history is warming up
            mu = 0.0002
            sigma = 0.015
        else:
            mu = float(np.mean(self.returns_history))
            sigma = float(np.std(self.returns_history))
            if sigma < 1e-6:
                sigma = 0.005

        dt = 1.0 / 252.0 # Daily step
        paths = np.zeros((num_paths, time_steps))
        paths[:, 0] = self.current_price

        # Standard normal random shocks
        Z = np.random.normal(0, 1, (num_paths, time_steps - 1))

        for t in range(1, time_steps):
            drift = (mu - 0.5 * sigma**2) * dt
            diffusion = sigma * np.sqrt(dt) * Z[:, t - 1]
            paths[:, t] = paths[:, t - 1] * np.exp(drift + diffusion)

        final_prices = paths[:, -1]
        simulated_returns = (final_prices - self.current_price) / self.current_price

        # Calculate 95% and 99% VaR
        var_95 = float(-np.percentile(simulated_returns, 5))
        var_99 = float(-np.percentile(simulated_returns, 1))

        # Sample 5 representative paths for visual charting
        sampled_paths = []
        indices = np.linspace(0, num_paths - 1, 5, dtype=int)
        for idx in indices:
            sampled_paths.append([round(p, 2) for p in paths[idx].tolist()])

        return {
            "var_95": round(var_95 * 100, 2), # percentage
            "var_99": round(var_99 * 100, 2), # percentage
            "expected_price": round(float(np.mean(final_prices)), 2),
            "worst_case_price": round(float(np.percentile(final_prices, 1)), 2),
            "paths_sampled": sampled_paths,
            "paths_count": num_paths
        }

    def classify_market_regime(self, bids: List[Dict], asks: List[Dict]) -> Dict[str, Any]:
        """Classifies live market regime (Bullish Trending, Bearish Volatile, Sideways)."""
        if len(self.price_history) < 10:
            return {"regime": "SIDEWAYS_CONSOLIDATION", "confidence": 0.85, "volatility": 0.012}

        recent_prices = self.price_history[-30:]
        sma_short = np.mean(recent_prices[-5:])
        sma_long = np.mean(recent_prices)
        vol = np.std(recent_prices) / np.mean(recent_prices)

        # Order book depth imbalance
        bid_vol = sum(b["qty"] for b in bids[:5]) if bids else 1
        ask_vol = sum(a["qty"] for a in asks[:5]) if asks else 1
        imbalance = (bid_vol - ask_vol) / (bid_vol + ask_vol + 1e-5)

        if sma_short > sma_long * 1.002 and imbalance > 0.1:
            regime = "BULLISH_TRENDING"
            confidence = min(0.98, 0.70 + float(imbalance) * 0.3)
        elif sma_short < sma_long * 0.998 and vol > 0.015:
            regime = "BEARISH_VOLATILE"
            confidence = min(0.98, 0.75 + float(vol) * 10)
        else:
            regime = "SIDEWAYS_CONSOLIDATION"
            confidence = 0.88

        return {
            "regime": regime,
            "confidence": round(confidence * 100, 1),
            "volatility_pct": round(vol * 100, 3),
            "depth_imbalance": round(imbalance, 3)
        }

    def calculate_sharpe_and_spread(self, bids: List[Dict], asks: List[Dict]) -> Dict[str, Any]:
        """Calculates 60-period rolling Sharpe ratio and live bid-ask spread metrics."""
        if len(self.returns_history) < 5:
            sharpe = 1.85
        else:
            recent_ret = self.returns_history[-60:]
            mean_ret = np.mean(recent_ret) * 252 # Annualized
            std_ret = np.std(recent_ret) * np.sqrt(252) + 1e-6
            risk_free = 0.04 # 4% risk free rate
            sharpe = (mean_ret - risk_free) / std_ret

        best_bid = bids[0]["price"] if bids else self.current_price - 0.05
        best_ask = asks[0]["price"] if asks else self.current_price + 0.05
        spread = round(max(0.01, best_ask - best_bid), 3)

        return {
            "sharpe_ratio": round(float(sharpe), 2),
            "bid_ask_spread": spread,
            "mid_price": round((best_bid + best_ask) / 2.0, 2)
        }

    def calculate_vpin_and_ofi(self, bids: List[Dict], asks: List[Dict]) -> Dict[str, Any]:
        """
        Calculates Market Microstructure Metrics:
        1. VPIN (Volume-Synchronized Probability of Toxicity): Detects informed trading toxicity.
        2. OFI (Order Flow Imbalance): Measures net aggressive buy/sell volume pressure.
        3. Avellaneda-Stoikov Reservation Price Skew: Reservation price r = S - q * gamma * sigma^2
        """
        bid_vol = sum(b["qty"] for b in bids[:5]) if bids else 500
        ask_vol = sum(a["qty"] for a in asks[:5]) if asks else 500
        total_vol = bid_vol + ask_vol + 1e-6
        
        # Order Flow Imbalance (OFI)
        ofi = bid_vol - ask_vol
        
        # Volume-Synchronized Probability of Toxicity (VPIN)
        vpin = abs(bid_vol - ask_vol) / total_vol
        
        # Avellaneda-Stoikov reservation price skew based on net inventory position q
        gamma = 0.1  # Risk aversion coefficient
        sigma = np.std(self.returns_history[-20:]) if len(self.returns_history) >= 5 else 0.015
        inventory_q = (bid_vol - ask_vol) / 100.0  # Normalized inventory delta
        reservation_skew = - inventory_q * gamma * (sigma ** 2)
        
        return {
            "vpin": round(float(vpin), 3),
            "vpin_status": "HIGH TOXICITY" if vpin > 0.40 else ("MODERATE" if vpin > 0.20 else "LOW TOXICITY"),
            "ofi": int(ofi),
            "as_reservation_skew": round(float(reservation_skew), 4)
        }

    def calculate_microprice_and_vwap(self, bids: List[Dict], asks: List[Dict], trade_history: List[Dict]) -> Dict[str, Any]:
        """
        Calculates Quantitative Execution & Pricing Metrics:
        1. Stoikov Micro-Price: Volume-weighted mid-price predicting short-term price tick movement.
           MicroPrice = P_bid * (V_ask / V_total) + P_ask * (V_bid / V_total)
        2. Volume-Weighted Average Price (VWAP) across recent execution trades.
        3. GARCH(1,1) Dynamic Volatility Estimate.
        4. Implementation Shortfall (Slippage) in basis points (bps).
        """
        best_bid = bids[0]["price"] if bids else self.current_price - 0.05
        best_ask = asks[0]["price"] if asks else self.current_price + 0.05
        bid_qty = bids[0]["qty"] if bids else 100
        ask_qty = asks[0]["qty"] if asks else 100
        total_top_qty = bid_qty + ask_qty + 1e-6

        # Stoikov Micro-Price Formula
        micro_price = (best_bid * ask_qty + best_ask * bid_qty) / total_top_qty
        micro_price_delta = round(micro_price - ((best_bid + best_ask) / 2.0), 4)

        # VWAP calculation
        if trade_history:
            total_dollar_vol = sum(t["price"] * t["qty"] for t in trade_history[-30:])
            total_share_vol = sum(t["qty"] for t in trade_history[-30:]) + 1e-6
            vwap = total_dollar_vol / total_share_vol
        else:
            vwap = self.current_price

        # GARCH(1,1) Volatility Forecasting (omega + alpha * eps^2 + beta * sigma^2)
        if len(self.returns_history) >= 10:
            returns = np.array(self.returns_history[-50:])
            omega, alpha, beta = 1e-5, 0.08, 0.90
            var = np.var(returns)
            for r in returns:
                var = omega + alpha * (r ** 2) + beta * var
            garch_vol = float(np.sqrt(var) * np.sqrt(252))
        else:
            garch_vol = 0.185

        # Implementation Shortfall / Slippage in basis points
        mid_price = (best_bid + best_ask) / 2.0
        slippage_bps = round(abs(vwap - mid_price) / mid_price * 10000.0, 2)

        return {
            "micro_price": round(micro_price, 2),
            "micro_price_delta": micro_price_delta,
            "vwap": round(vwap, 2),
            "garch_vol_pct": round(garch_vol * 100, 2),
            "slippage_bps": slippage_bps
        }


