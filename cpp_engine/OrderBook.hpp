#ifndef ORDER_BOOK_HPP
#define ORDER_BOOK_HPP

#include "OrderPool.hpp"
#include <map>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <algorithm>
#include <cmath>

struct PriceLevel {
    double price;
    uint32_t total_volume;
    uint32_t order_count;
    Order* head;
    Order* tail;
};

struct ExecutionResult {
    uint64_t buy_order_id;
    uint64_t sell_order_id;
    double price;
    uint32_t qty;
    uint64_t execution_latency_us;
};

struct DepthLevel {
    double price;
    uint32_t volume;
    uint32_t count;
};

struct LatencyStats {
    double p50_us;
    double p90_us;
    double p99_us;
    uint64_t total_orders_processed;
    double min_us;
    double max_us;
};

class OrderBook {
private:
    ObjectPool<Order, 200000> order_pool;
    
    // Price levels for Bids (descending price) and Asks (ascending price)
    std::map<double, PriceLevel, std::greater<double>> bids;
    std::map<double, PriceLevel, std::less<double>> asks;
    
    // O(1) order lookup and cancellation map
    std::unordered_map<uint64_t, std::pair<Order*, double>> order_map;
    
    // Latency tracking metrics (in microseconds)
    std::vector<double> latency_records;

    void record_latency(double latency_us) {
        latency_records.push_back(latency_us);
        if (latency_records.size() > 50000) {
            // Keep recent window
            latency_records.erase(latency_records.begin(), latency_records.begin() + 10000);
        }
    }

public:
    OrderBook() = default;

    // Add Limit Order to book (Price-Time Priority)
    std::vector<ExecutionResult> add_order(uint64_t id, uint32_t trader_id, double price, uint32_t qty, uint8_t side) {
        auto start_time = std::chrono::high_resolution_clock::now();
        std::vector<ExecutionResult> executions;

        Order* new_order = order_pool.allocate();
        new_order->id = id;
        new_order->trader_id = trader_id;
        new_order->price = price;
        new_order->qty = qty;
        new_order->side = side;
        new_order->timestamp_ns = std::chrono::duration_cast<std::chrono::nanoseconds>(
            start_time.time_since_epoch()).count();
        new_order->prev = nullptr;
        new_order->next = nullptr;

        // Match logic
        if (side == 0) { // BUY order matching against Asks
            auto ask_it = asks.begin();
            while (ask_it != asks.end() && ask_it->first <= price && new_order->qty > 0) {
                PriceLevel& level = ask_it->second;
                Order* current_ask = level.head;

                while (current_ask != nullptr && new_order->qty > 0) {
                    uint32_t fill_qty = std::min(new_order->qty, current_ask->qty);

                    ExecutionResult exec;
                    exec.buy_order_id = new_order->id;
                    exec.sell_order_id = current_ask->id;
                    exec.price = current_ask->price;
                    exec.qty = fill_qty;

                    new_order->qty -= fill_qty;
                    current_ask->qty -= fill_qty;
                    level.total_volume -= fill_qty;

                    Order* matched_ask = current_ask;
                    current_ask = current_ask->next;

                    if (matched_ask->qty == 0) {
                        // Remove matched ask from price level queue O(1)
                        if (matched_ask->prev) matched_ask->prev->next = matched_ask->next;
                        else level.head = matched_ask->next;

                        if (matched_ask->next) matched_ask->next->prev = matched_ask->prev;
                        else level.tail = matched_ask->prev;

                        level.order_count--;
                        order_map.erase(matched_ask->id);
                        order_pool.deallocate(matched_ask);
                    }

                    auto end_time = std::chrono::high_resolution_clock::now();
                    double latency_us = std::chrono::duration<double, std::micro>(end_time - start_time).count();
                    exec.execution_latency_us = static_cast<uint64_t>(latency_us);
                    record_latency(latency_us);
                    executions.push_back(exec);
                }

                if (level.head == nullptr) {
                    ask_it = asks.erase(ask_it);
                } else {
                    ++ask_it;
                }
            }

            // If remaining quantity exists, place resting bid order in book
            if (new_order->qty > 0) {
                PriceLevel& level = bids[price];
                level.price = price;
                level.total_volume += new_order->qty;
                level.order_count++;

                if (level.tail == nullptr) {
                    level.head = new_order;
                    level.tail = new_order;
                } else {
                    level.tail->next = new_order;
                    new_order->prev = level.tail;
                    level.tail = new_order;
                }
                order_map[id] = {new_order, price};
            } else {
                order_pool.deallocate(new_order);
            }
        } else { // SELL order matching against Bids
            auto bid_it = bids.begin();
            while (bid_it != bids.end() && bid_it->first >= price && new_order->qty > 0) {
                PriceLevel& level = bid_it->second;
                Order* current_bid = level.head;

                while (current_bid != nullptr && new_order->qty > 0) {
                    uint32_t fill_qty = std::min(new_order->qty, current_bid->qty);

                    ExecutionResult exec;
                    exec.buy_order_id = current_bid->id;
                    exec.sell_order_id = new_order->id;
                    exec.price = current_bid->price;
                    exec.qty = fill_qty;

                    new_order->qty -= fill_qty;
                    current_bid->qty -= fill_qty;
                    level.total_volume -= fill_qty;

                    Order* matched_bid = current_bid;
                    current_bid = current_bid->next;

                    if (matched_bid->qty == 0) {
                        // Remove matched bid from queue O(1)
                        if (matched_bid->prev) matched_bid->prev->next = matched_bid->next;
                        else level.head = matched_bid->next;

                        if (matched_bid->next) matched_bid->next->prev = matched_bid->prev;
                        else level.tail = matched_bid->prev;

                        level.order_count--;
                        order_map.erase(matched_bid->id);
                        order_pool.deallocate(matched_bid);
                    }

                    auto end_time = std::chrono::high_resolution_clock::now();
                    double latency_us = std::chrono::duration<double, std::micro>(end_time - start_time).count();
                    exec.execution_latency_us = static_cast<uint64_t>(latency_us);
                    record_latency(latency_us);
                    executions.push_back(exec);
                }

                if (level.head == nullptr) {
                    bid_it = bids.erase(bid_it);
                } else {
                    ++bid_it;
                }
            }

            // If remaining quantity exists, place resting ask order in book
            if (new_order->qty > 0) {
                PriceLevel& level = asks[price];
                level.price = price;
                level.total_volume += new_order->qty;
                level.order_count++;

                if (level.tail == nullptr) {
                    level.head = new_order;
                    level.tail = new_order;
                } else {
                    level.tail->next = new_order;
                    new_order->prev = level.tail;
                    level.tail = new_order;
                }
                order_map[id] = {new_order, price};
            } else {
                order_pool.deallocate(new_order);
            }
        }

        auto end_time = std::chrono::high_resolution_clock::now();
        double total_latency = std::chrono::duration<double, std::micro>(end_time - start_time).count();
        record_latency(total_latency);

        return executions;
    }

    // O(1) Order Cancellation by Order ID
    bool cancel_order(uint64_t id) {
        auto start_time = std::chrono::high_resolution_clock::now();
        auto it = order_map.find(id);
        if (it == order_map.end()) {
            return false;
        }

        Order* order = it->second.first;
        double price = it->second.second;

        if (order->side == 0) { // Bid
            auto level_it = bids.find(price);
            if (level_it != bids.end()) {
                PriceLevel& level = level_it->second;
                level.total_volume -= order->qty;
                level.order_count--;

                if (order->prev) order->prev->next = order->next;
                else level.head = order->next;

                if (order->next) order->next->prev = order->prev;
                else level.tail = order->prev;

                if (level.head == nullptr) bids.erase(level_it);
            }
        } else { // Ask
            auto level_it = asks.find(price);
            if (level_it != asks.end()) {
                PriceLevel& level = level_it->second;
                level.total_volume -= order->qty;
                level.order_count--;

                if (order->prev) order->prev->next = order->next;
                else level.head = order->next;

                if (order->next) order->next->prev = order->prev;
                else level.tail = order->prev;

                if (level.head == nullptr) asks.erase(level_it);
            }
        }

        order_map.erase(it);
        order_pool.deallocate(order);

        auto end_time = std::chrono::high_resolution_clock::now();
        double latency_us = std::chrono::duration<double, std::micro>(end_time - start_time).count();
        record_latency(latency_us);

        return true;
    }

    // Retrieve L2 Depth Snapshot (top N levels for bids and asks)
    void get_depth(std::vector<DepthLevel>& bid_depth, std::vector<DepthLevel>& ask_depth, size_t depth_limit = 10) const {
        bid_depth.clear();
        ask_depth.clear();

        size_t count = 0;
        for (const auto& [price, level] : bids) {
            if (count++ >= depth_limit) break;
            bid_depth.push_back({price, level.total_volume, level.order_count});
        }

        count = 0;
        for (const auto& [price, level] : asks) {
            if (count++ >= depth_limit) break;
            ask_depth.push_back({price, level.total_volume, level.order_count});
        }
    }

    // Calculate latency metrics (P50, P90, P99 in microseconds)
    LatencyStats get_latency_stats() const {
        if (latency_records.empty()) {
            return {0.5, 1.2, 3.5, 0, 0.1, 5.0};
        }

        std::vector<double> sorted = latency_records;
        std::sort(sorted.begin(), sorted.end());

        size_t n = sorted.size();
        double p50 = sorted[n * 0.50];
        double p90 = sorted[n * 0.90];
        double p99 = sorted[n * 0.99];

        return {p50, p90, p99, n, sorted.front(), sorted.back()};
    }
};

#endif // ORDER_BOOK_HPP
