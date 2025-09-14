from enum import Enum


class QueueType(Enum):
    DURABLE = "durable"
    TRANSIENT = "transient"


class ExchangeType(Enum):
    DIRECT = "direct"
    TOPIC = "topic"
    FANOUT = "fanout"
    HEADERS = "headers"
