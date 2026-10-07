#include <iostream>
#include <vector>
#include <algorithm>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <memory>
#include "OrderBook.hpp"

// Global memory allocation tracker
static uint64_t g_allocation_count = 0;
static uint64_t g_allocated_bytes = 0;
static bool g_tracking_enabled = false;

void* operator new(std::size_t size) {
    if (g_tracking_enabled) {
        g_allocation_count++;
        g_allocated_bytes += size;
    }
    void* ptr = std::malloc(size);
    if (!ptr) throw std::bad_alloc();
    return ptr;
}

void operator delete(void* ptr) noexcept {
    std::free(ptr);
}

void operator delete(void* ptr, std::size_t) noexcept {
    std::free(ptr);
}

int main() {
    try {
        std::cout << "==================================================" << std::endl;
        std::cout << "  Apex-Quant C++20 OrderBook Matching Benchmark" << std::endl;
        std::cout << "==================================================" << std::endl;

        // OrderBook is ~12.8MB due to internal ObjectPool array; allocate on heap to avoid stack overflow.
        auto book = std::make_unique<OrderBook>();
        const int WARMUP_ORDERS = 1000;
        const int BENCHMARK_ORDERS = 100000;

        // Warmup phase (populates price levels and hashtables)
        uint64_t order_id = 1;
        for (int i = 0; i < WARMUP_ORDERS; ++i) {
            double price = 100.0 + (i % 20) * 0.1;
            uint8_t side = (i % 2 == 0) ? 0 : 1;
            book->add_order(order_id++, 101, price, 10, side);
        }

        // Enable allocation tracking for benchmark phase
        g_allocation_count = 0;
        g_allocated_bytes = 0;
        g_tracking_enabled = true;

        std::vector<double> latencies_us;
        latencies_us.reserve(BENCHMARK_ORDERS);

        auto start_total = std::chrono::high_resolution_clock::now();

        for (int i = 0; i < BENCHMARK_ORDERS; ++i) {
            double price = 100.0 + (i % 20) * 0.1;
            uint8_t side = (i % 2 == 0) ? 0 : 1;
            uint32_t qty = 10;

            auto start_op = std::chrono::high_resolution_clock::now();
            book->add_order(order_id++, 101, price, qty, side);
            auto end_op = std::chrono::high_resolution_clock::now();

            double lat = std::chrono::duration<double, std::micro>(end_op - start_op).count();
            latencies_us.push_back(lat);

            if (i % 5 == 0 && order_id > 100) {
                uint64_t cancel_id = order_id - 50;
                book->cancel_order(cancel_id);
            }
        }

        auto end_total = std::chrono::high_resolution_clock::now();
        g_tracking_enabled = false;

        double total_time_sec = std::chrono::duration<double>(end_total - start_total).count();
        double ops_per_sec = BENCHMARK_ORDERS / total_time_sec;
        double allocs_per_order = static_cast<double>(g_allocation_count) / BENCHMARK_ORDERS;

        std::sort(latencies_us.begin(), latencies_us.end());

        double p50 = latencies_us[static_cast<size_t>(BENCHMARK_ORDERS * 0.50)];
        double p90 = latencies_us[static_cast<size_t>(BENCHMARK_ORDERS * 0.90)];
        double p99 = latencies_us[static_cast<size_t>(BENCHMARK_ORDERS * 0.99)];
        double min_lat = latencies_us.front();
        double max_lat = latencies_us.back();

        std::cout << std::fixed << std::setprecision(2);
        std::cout << "Processed " << BENCHMARK_ORDERS << " orders in " << total_time_sec << " s (" << static_cast<uint64_t>(ops_per_sec) << " ops/sec)" << std::endl;
        std::cout << "P50 Latency : " << p50 << " us" << std::endl;
        std::cout << "P90 Latency : " << p90 << " us" << std::endl;
        std::cout << "P99 Latency : " << p99 << " us" << std::endl;
        std::cout << "Min Latency : " << min_lat << " us" << std::endl;
        std::cout << "Max Latency : " << max_lat << " us" << std::endl;
        std::cout << "Allocations : " << allocs_per_order << " per order (Total: " << g_allocation_count << " allocs, " << g_allocated_bytes << " bytes)" << std::endl;
        std::cout << "==================================================" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "EXCEPTION: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}
