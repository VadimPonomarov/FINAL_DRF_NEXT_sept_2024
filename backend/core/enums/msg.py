from enum import Enum

from config.extra_config import BASE_URL


class MessagesEnum(Enum):
    EMAIL_ACTIVATE = "Activate your account: {BASE_URL}/{resource}?token={token}"
    PASSWORD_RESET = "Reset password token: {token}"
    WELCOME_MESSAGE = "Welcome {username}! Visit {BASE_URL} to start."

    def get_message(self, **kwargs):
        if "BASE_URL" not in kwargs:
            kwargs["BASE_URL"] = BASE_URL

        try:
            return self.value.format(**kwargs)
        except KeyError as e:
            missing_param = str(e).strip("'")
            raise ValueError(f"Missing required parameter: {missing_param}") from e
