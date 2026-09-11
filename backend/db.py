import sqlite3
import os
import json
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "trading_platform.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable Write-Ahead Logging (WAL) mode for concurrent high-speed reads and writes
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_db_connection()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS executions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                buy_order_id INTEGER,
                sell_order_id INTEGER,
                price REAL,
                qty INTEGER,
                latency_us REAL,
                timestamp_ns INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS latency_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                p50_us REAL,
                p90_us REAL,
                p99_us REAL,
                total_orders INTEGER,
                timestamp INTEGER
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS risk_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                var_95 REAL,
                var_99 REAL,
                regime TEXT,
                sharpe_ratio REAL,
                mid_price REAL,
                timestamp INTEGER
            );
        """)
    conn.close()
    print(f"[Database] SQLite initialized with WAL mode at {DB_PATH}")

def log_executions(executions):
    if not executions:
        return
    conn = get_db_connection()
    with conn:
        conn.executemany("""
            INSERT INTO executions (buy_order_id, sell_order_id, price, qty, latency_us, timestamp_ns)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [(
            e["buy_id"], e["sell_id"], e["price"], e["qty"],
            e.get("latency_us", 1.0), time.time_ns()
        ) for e in executions])
    conn.close()

def log_latency_snapshot(stats):
    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT INTO latency_logs (p50_us, p90_us, p99_us, total_orders, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (stats["p50"], stats["p90"], stats["p99"], stats["total"], int(time.time())))
    conn.close()

def get_recent_executions(limit: int = 50):
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM executions ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(row) for row in rows]
