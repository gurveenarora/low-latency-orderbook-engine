#ifndef ORDER_POOL_HPP
#define ORDER_POOL_HPP

#include <vector>
#include <cstdint>
#include <stdexcept>
#include <iostream>

// Struct representing an individual limit order
struct Order {
    uint64_t id;
    uint32_t trader_id;
    double price;
    uint32_t qty;
    uint8_t side; // 0 = BUY (Bid), 1 = SELL (Ask)
    uint64_t timestamp_ns;
    
    // Intrusive doubly-linked list pointers for O(1) order queue operations
    Order* prev;
    Order* next;
};

// Fixed-capacity lock-free / zero-allocation memory pool
template <typename T, size_t Capacity = 100000>
class ObjectPool {
private:
    T pool[Capacity];
    T* free_list[Capacity];
    size_t free_index;

public:
    ObjectPool() : free_index(Capacity) {
        for (size_t i = 0; i < Capacity; ++i) {
            free_list[i] = &pool[i];
        }
    }

    // Allocate an object from pre-allocated memory
    T* allocate() {
        if (free_index == 0) {
            throw std::runtime_error("ObjectPool capacity exhausted! Zero-allocation limit reached.");
        }
        return free_list[--free_index];
    }

    // Return object to pre-allocated free list
    void deallocate(T* ptr) {
        if (free_index < Capacity) {
            free_list[free_index++] = ptr;
        }
    }

    size_t available() const {
        return free_index;
    }

    size_t capacity() const {
        return Capacity;
    }
};

#endif // ORDER_POOL_HPP
