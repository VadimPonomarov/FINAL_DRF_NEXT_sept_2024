def camel_case_to_snake_case(input_str: str) -> str:
    input_str = input_str.replace("_Model", "").replace("Model", "")
    chars = []
    for c_idx, char in enumerate(input_str):
        if c_idx and char.isupper():
            nxt_idx = c_idx + 1
            flag = nxt_idx >= len(input_str) or input_str[nxt_idx].isupper()
            prev_char = input_str[c_idx - 1]
            if prev_char.isupper() and flag:
                pass
            else:
                chars.append("_")
        chars.append(char.lower())
    return "".join(chars)


def str_to_bool(value: str) -> bool:
    return value.lower() in ("yes", "true", "t", "1", "on", "y", "enable", 1)


def pydantic_schema_to_openapi(pydantic_schema):
    from drf_yasg import openapi
    return openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties=pydantic_schema.model_json_schema()["properties"],
    )
