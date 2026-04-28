import json
import logging
from typing import Callable, Any
import redis.asyncio as redis

from backend.config import config

logger = logging.getLogger(__name__)

class MessageBus:
    def __init__(self):
        self.redis_url = config.REDIS_URL
        self.client = None
        self.pubsub = None
        self.is_connected = False
        
    async def connect(self):
        try:
            self.client = redis.from_url(self.redis_url)
            self.pubsub = self.client.pubsub()
            self.is_connected = True
            logger.info(f"Connected to Redis at {self.redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.is_connected = False

    async def disconnect(self):
        if self.pubsub:
            await self.pubsub.close()
        if self.client:
            await self.client.aclose()
        self.is_connected = False

    async def publish(self, channel: str, message: dict):
        """Publish a JSON message to a specific channel."""
        if not self.is_connected:
            logger.warning("Cannot publish message, Redis not connected.")
            return
            
        try:
            payload = json.dumps(message)
            await self.client.publish(channel, payload)
        except Exception as e:
            logger.error(f"Failed to publish message: {e}")

    async def subscribe(self, channel: str, callback: Callable[[dict], Any]):
        """
        Subscribe to a channel and invoke callback on new messages.
        This runs an infinite loop in the background.
        """
        if not self.is_connected:
            logger.warning("Cannot subscribe, Redis not connected.")
            return
            
        try:
            await self.pubsub.subscribe(channel)
            logger.info(f"Subscribed to Redis channel: {channel}")
            
            # The listen loop
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    try:
                        data = json.loads(message['data'])
                        # Call the callback asynchronously if it's an async function
                        import asyncio
                        if asyncio.iscoroutinefunction(callback):
                            await callback(data)
                        else:
                            callback(data)
                    except json.JSONDecodeError:
                        logger.error("Failed to decode message from Redis")
        except Exception as e:
            logger.error(f"Subscription error: {e}")

message_bus = MessageBus()
