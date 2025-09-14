from cryptography.fernet import Fernet
import os

# Ensure the key exists in the same directory as the script
def get_or_create_key():
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

# Encrypt a message
def encrypt_message(message, fernet):
    encrypted_message = fernet.encrypt(message.encode())
    return encrypted_message

if __name__ == "__main__":
    # Load or create the encryption key
    key = get_or_create_key()
    fernet = Fernet(key)

    # Prompt the user to enter a message to encrypt
    user_input = input("Enter the object to encrypt: ")
    encrypted = encrypt_message(user_input, fernet)
    print(f"Encrypted object: {encrypted.decode()}")
