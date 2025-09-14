#!/usr/bin/env python3
"""
🚀 AutoRia Clone - Interactive Deployment Script
Интерактивный скрипт деплоя с мониторингом логов в реальном времени
"""

import os
import sys
import subprocess
import time
import json
import requests
import threading
import queue
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import shutil
import signal

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class ProgressIndicator:
    """Animated progress indicator"""
    
    def __init__(self, message: str):
        self.message = message
        self.running = False
        self.thread = None
        self.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
        self.current_frame = 0
        
    def start(self):
        """Start the progress indicator"""
        self.running = True
        self.thread = threading.Thread(target=self._animate)
        self.thread.daemon = True
        self.thread.start()
        
    def stop(self, success: bool = True, final_message: str = None):
        """Stop the progress indicator"""
        self.running = False
        if self.thread:
            self.thread.join()
        
        # Clear the line and show final status
        print(f"\r{' ' * 80}\r", end='')
        if final_message:
            icon = "✅" if success else "❌"
            color = Colors.OKGREEN if success else Colors.FAIL
            print(f"{color}{icon} {final_message}{Colors.ENDC}")
        
    def _animate(self):
        """Animate the progress indicator"""
        while self.running:
            frame = self.frames[self.current_frame]
            print(f"\r{Colors.OKCYAN}{frame} {self.message}...{Colors.ENDC}", end='', flush=True)
            self.current_frame = (self.current_frame + 1) % len(self.frames)
            time.sleep(0.1)

class LogMonitor:
    """Monitor and display logs in real-time"""
    
    def __init__(self):
        self.log_queue = queue.Queue()
        self.monitoring = False
        
    def start_monitoring(self, command: str, cwd: Path):
        """Start monitoring command output"""
        self.monitoring = True
        thread = threading.Thread(target=self._monitor_process, args=(command, cwd))
        thread.daemon = True
        thread.start()
        return thread
        
    def _monitor_process(self, command: str, cwd: Path):
        """Monitor process output and put it in queue"""
        try:
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            while self.monitoring and process.poll() is None:
                line = process.stdout.readline()
                if line:
                    self.log_queue.put(('stdout', line.strip()))
                    
            # Get remaining output
            remaining_output, _ = process.communicate()
            if remaining_output:
                for line in remaining_output.split('\n'):
                    if line.strip():
                        self.log_queue.put(('stdout', line.strip()))
                        
            self.log_queue.put(('exit', process.returncode))
            
        except Exception as e:
            self.log_queue.put(('error', str(e)))
            
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False
        
    def get_logs(self) -> List[Tuple[str, str]]:
        """Get all available logs"""
        logs = []
        while not self.log_queue.empty():
            try:
                logs.append(self.log_queue.get_nowait())
            except queue.Empty:
                break
        return logs

class InteractiveDeploymentManager:
    """Interactive deployment manager with real-time monitoring"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.log_monitor = LogMonitor()
        self.services_status = {}
        
    def print_header(self, message: str):
        """Print formatted header"""
        print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}🚀 {message}{Colors.ENDC}")
        print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")
        
    def print_step(self, step: str, message: str):
        """Print formatted step"""
        print(f"{Colors.OKBLUE}{Colors.BOLD}[{step}]{Colors.ENDC} {message}")
        
    def print_success(self, message: str):
        """Print success message"""
        print(f"{Colors.OKGREEN}✅ {message}{Colors.ENDC}")
        
    def print_warning(self, message: str):
        """Print warning message"""
        print(f"{Colors.WARNING}⚠️  {message}{Colors.ENDC}")
        
    def print_error(self, message: str):
        """Print error message"""
        print(f"{Colors.FAIL}❌ {message}{Colors.ENDC}")
        
    def ask_user_confirmation(self, question: str, default: bool = False) -> bool:
        """Ask user for confirmation"""
        default_text = "Y/n" if default else "y/N"
        response = input(f"{Colors.WARNING}❓ {question} [{default_text}]: {Colors.ENDC}").strip().lower()
        
        if not response:
            return default
        return response in ['y', 'yes', 'да', 'д']
        
    def run_command_with_progress(self, command: str, message: str, cwd: Optional[Path] = None, 
                                show_logs: bool = True, timeout: int = 300) -> bool:
        """Run command with progress indicator and optional log monitoring"""
        
        progress = ProgressIndicator(message)
        progress.start()
        
        try:
            if show_logs:
                # Start log monitoring
                monitor_thread = self.log_monitor.start_monitoring(command, cwd or self.project_root)
                
                start_time = time.time()
                last_log_time = start_time
                
                while monitor_thread.is_alive():
                    # Check for timeout
                    if time.time() - start_time > timeout:
                        progress.stop(False, f"Command timed out after {timeout}s")
                        self.log_monitor.stop_monitoring()
                        return False
                    
                    # Get and display logs
                    logs = self.log_monitor.get_logs()
                    for log_type, log_message in logs:
                        if log_type == 'stdout':
                            # Stop progress, show log, restart progress
                            progress.stop(True, "")
                            print(f"  {Colors.OKCYAN}📋 {log_message}{Colors.ENDC}")
                            progress = ProgressIndicator(message)
                            progress.start()
                            last_log_time = time.time()
                        elif log_type == 'exit':
                            progress.stop(log_message == 0, 
                                        f"Command completed with exit code {log_message}")
                            return log_message == 0
                        elif log_type == 'error':
                            progress.stop(False, f"Command failed: {log_message}")
                            return False
                    
                    # Show "still working" message if no logs for a while
                    if time.time() - last_log_time > 30:
                        progress.stop(True, "")
                        print(f"  {Colors.WARNING}⏳ Still working... (no output for {int(time.time() - last_log_time)}s){Colors.ENDC}")
                        progress = ProgressIndicator(message)
                        progress.start()
                        last_log_time = time.time()
                    
                    time.sleep(0.5)
                    
                # Final check for any remaining logs
                logs = self.log_monitor.get_logs()
                for log_type, log_message in logs:
                    if log_type == 'exit':
                        progress.stop(log_message == 0, 
                                    f"Command completed with exit code {log_message}")
                        return log_message == 0
                        
                progress.stop(True, "Command completed")
                return True
                
            else:
                # Simple command execution without log monitoring
                result = subprocess.run(
                    command,
                    shell=True,
                    cwd=cwd or self.project_root,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
                
                progress.stop(result.returncode == 0, 
                            f"Command completed with exit code {result.returncode}")
                
                if result.returncode != 0 and result.stderr:
                    print(f"  {Colors.FAIL}Error: {result.stderr}{Colors.ENDC}")
                    
                return result.returncode == 0
                
        except subprocess.TimeoutExpired:
            progress.stop(False, f"Command timed out after {timeout}s")
            return False
        except KeyboardInterrupt:
            progress.stop(False, "Command interrupted by user")
            self.log_monitor.stop_monitoring()
            raise
        except Exception as e:
            progress.stop(False, f"Command failed: {str(e)}")
            return False
