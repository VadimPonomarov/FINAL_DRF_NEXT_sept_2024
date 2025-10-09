import socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(3)
try:
    s.connect(("172.18.0.4", 5672))
    print("Port 5672 is open")
    s.close()
except Exception as e:
    print("Port 5672 is closed or unreachable: " + str(e))