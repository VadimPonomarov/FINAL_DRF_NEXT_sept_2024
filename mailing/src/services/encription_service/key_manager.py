from cryptography.fernet import Fernet
import os

# Ensure the key exists in the same directory as the script
def get_or_create_key():
    # Get the directory of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(script_dir, "key.txt")

    try:
        with open(key_path, "rb") as key_file:
            return key_file.read()
    except FileNotFoundError:
        key = Fernet.generate_key()
        with open(key_path, "wb") as key_file:
            key_file.write(key)
        print(f"Key generated and saved to {key_path}")
        return key

if __name__ == "__main__":
    get_or_create_key()
