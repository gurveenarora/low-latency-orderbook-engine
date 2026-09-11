#include "OrderBook.hpp"
#include <sstream>
#include <cstring>
#include <iostream>

extern "C" {

#ifdef _WIN32
    #define EXPORT __declspec(dllexport)
#else
    #define EXPORT __attribute__((visibility("default")))
#endif

EXPORT void* create_orderbook() {
    return new OrderBook();
}

EXPORT void destroy_orderbook(void* handle) {
    if (handle) {
        delete static_cast<OrderBook*>(handle);
    }
}

EXPORT int add_order_c(void* handle, uint64_t id, uint32_t trader_id, double price, uint32_t qty, uint8_t side, char* out_json, int max_len) {
    if (!handle) return -1;
    OrderBook* book = static_cast<OrderBook*>(handle);
    
    auto execs = book->add_order(id, trader_id, price, qty, side);

    std::stringstream ss;
    ss << "[";
    for (size_t i = 0; i < execs.size(); ++i) {
        ss << "{\"buy_id\":" << execs[i].buy_order_id
           << ",\"sell_id\":" << execs[i].sell_order_id
           << ",\"price\":" << execs[i].price
           << ",\"qty\":" << execs[i].qty
           << ",\"latency_us\":" << execs[i].execution_latency_us << "}";
        if (i + 1 < execs.size()) ss << ",";
    }
    ss << "]";

    std::string str = ss.str();
    if (out_json && max_len > 0) {
        strncpy(out_json, str.c_str(), max_len - 1);
        out_json[max_len - 1] = '\0';
    }
    return static_cast<int>(execs.size());
}

EXPORT int cancel_order_c(void* handle, uint64_t id) {
    if (!handle) return 0;
    OrderBook* book = static_cast<OrderBook*>(handle);
    return book->cancel_order(id) ? 1 : 0;
}

EXPORT int get_depth_c(void* handle, char* out_json, int max_len) {
    if (!handle) return -1;
    OrderBook* book = static_cast<OrderBook*>(handle);

    std::vector<DepthLevel> bids, asks;
    book->get_depth(bids, asks, 15);

    std::stringstream ss;
    ss << "{\"bids\":[";
    for (size_t i = 0; i < bids.size(); ++i) {
        ss << "{\"price\":" << bids[i].price << ",\"qty\":" << bids[i].volume << ",\"count\":" << bids[i].count << "}";
        if (i + 1 < bids.size()) ss << ",";
    }
    ss << "],\"asks\":[";
    for (size_t i = 0; i < asks.size(); ++i) {
        ss << "{\"price\":" << asks[i].price << ",\"qty\":" << asks[i].volume << ",\"count\":" << asks[i].count << "}";
        if (i + 1 < asks.size()) ss << ",";
    }
    ss << "]}";

    std::string str = ss.str();
    if (out_json && max_len > 0) {
        strncpy(out_json, str.c_str(), max_len - 1);
        out_json[max_len - 1] = '\0';
    }
    return 0;
}

EXPORT int get_latency_stats_c(void* handle, double* p50, double* p90, double* p99, uint64_t* total_count) {
    if (!handle) return -1;
    OrderBook* book = static_cast<OrderBook*>(handle);
    LatencyStats stats = book->get_latency_stats();
    if (p50) *p50 = stats.p50_us;
    if (p90) *p90 = stats.p90_us;
    if (p99) *p99 = stats.p99_us;
    if (total_count) *total_count = stats.total_orders_processed;
    return 0;
}

}
