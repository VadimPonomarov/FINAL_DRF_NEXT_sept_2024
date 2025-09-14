from datetime import timedelta
from enum import Enum


class ActionTokenEnum(Enum):
    ACTIVATE = ("activate", timedelta(minutes=30))
    CHANGE_PASSWORD = ("change_password", timedelta(minutes=30))
    SOCKET = ("socket", timedelta(minutes=3))

    def __init__(self, token_type, lifetime):
        self.token_type = token_type
        self.lifetime = lifetime
