import argparse
import sys
import subprocess
from typing import List


def _run_command(command: str) -> subprocess.CompletedProcess:
    """Run shell command and return CompletedProcess with text output."""
    return subprocess.run(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def _cleanup_port_windows(port: int) -> None:
    """Terminate LISTENING processes on the given port on Windows using netstat/taskkill."""
    result = _run_command(f"netstat -ano | findstr :{port} | findstr LISTENING")
    if result.returncode != 0 or not result.stdout.strip():
        print(f"[INFO] No LISTENING processes found on port {port} (Windows)")
        return

    print(f"[INFO] Found processes on port {port} (Windows):")
    for line in result.stdout.strip().splitlines():
        parts = line.split()
        if not parts:
            continue
        pid = parts[-1]
        print(f"  -> Killing PID {pid} on port {port} ...")
        _run_command(f"taskkill /F /PID {pid}")


def _cleanup_port_unix(port: int) -> None:
    """Terminate processes on the given port on Unix-like systems using lsof/kill."""
    result = _run_command(f"lsof -ti:{port}")
    if result.returncode != 0 or not result.stdout.strip():
        print(f"[INFO] No processes found on port {port} (Unix)")
        return

    pids = [p.strip() for p in result.stdout.strip().splitlines() if p.strip()]
    if not pids:
        print(f"[INFO] No processes found on port {port} (Unix)")
        return

    print(f"[INFO] Found processes on port {port} (Unix): {', '.join(pids)}")
    _run_command("kill -9 " + " ".join(pids))


def cleanup_ports(ports: List[int]) -> None:
    """Clean up all given ports by terminating listening processes.

    Works on Windows (netstat/taskkill) and Unix-likes (lsof/kill).
    """
    if not ports:
        print("[INFO] No ports specified, nothing to do")
        return

    print(f"[INFO] Starting port cleanup for: {', '.join(str(p) for p in ports)}")

    if sys.platform == "win32":
        for port in ports:
            try:
                _cleanup_port_windows(port)
            except Exception as exc:  # noqa: BLE001
                print(f"[WARN] Failed to cleanup port {port} on Windows: {exc}")
    else:
        for port in ports:
            try:
                _cleanup_port_unix(port)
            except Exception as exc:  # noqa: BLE001
                print(f"[WARN] Failed to cleanup port {port} on Unix: {exc}")

    print("[INFO] Port cleanup finished")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cleanup local ports before running docker-compose/deploy (default: 3000)",
    )
    parser.add_argument(
        "--ports",
        nargs="*",
        type=int,
        default=[3000],
        help="List of ports to cleanup (default: 3000)",
    )
    args = parser.parse_args()

    cleanup_ports(args.ports)


if __name__ == "__main__":
    main()
