import asyncio
import time

class AsyncMessageBroker:
    """High-throughput asynchronous message broker queue buffer smoothing out order volume bursts."""
    def __init__(self, queue_maxsize: int = 50000):
        self.queue = asyncio.Queue(maxsize=queue_maxsize)
        self.processed_count = 0
        self.dropped_count = 0
        self.listeners = []

    async def publish_order(self, order_data: dict) -> bool:
        try:
            self.queue.put_nowait(order_data)
            return True
        except asyncio.QueueFull:
            self.dropped_count += 1
            return False

    async def start_consumer(self, engine_callback):
        """Consume messages asynchronously from broker and route to C++ matching engine."""
        print("[MessageBroker] Asynchronous consumer worker started.")
        while True:
            try:
                order_data = await self.queue.get()
                self.processed_count += 1
                
                # Execute matching via engine callback
                executions = engine_callback(
                    order_data["id"],
                    order_data["trader_id"],
                    order_data["price"],
                    order_data["qty"],
                    order_data["side"]
                )

                # Notify registered listeners (e.g. WebSocket broadcaster)
                for listener in self.listeners:
                    try:
                        await listener(order_data, executions)
                    except Exception as e:
                        pass

                self.queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[MessageBroker] Consumer error: {e}")

    def add_listener(self, callback):
        self.listeners.append(callback)

    def stats(self):
        return {
            "queue_depth": self.queue.qsize(),
            "processed_count": self.processed_count,
            "dropped_count": self.dropped_count
        }
