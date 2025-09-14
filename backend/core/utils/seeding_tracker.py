"""
Seeding tracker utility for preventing duplicate seeding operations.
Works without requiring database migrations by using a simple JSON file.
"""
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path


class SeedingTracker:
    """
    Track completed seeding operations to prevent duplicates.
    Uses a JSON file for persistence, similar to django_migrations but simpler.
    """
    
    def __init__(self, tracker_file: str = None):
        """Initialize the seeding tracker."""
        if tracker_file is None:
            # Store in media directory which is persistent
            tracker_file = "/app/media/seeding_history.json"
        
        self.tracker_file = Path(tracker_file)
        self.tracker_file.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_tracker_file()
    
    def _ensure_tracker_file(self):
        """Ensure the tracker file exists with proper structure."""
        if not self.tracker_file.exists():
            initial_data = {
                "version": "1.0.0",
                "created_at": datetime.now().isoformat(),
                "seeding_operations": {}
            }
            self._save_data(initial_data)
    
    def _load_data(self) -> Dict[str, Any]:
        """Load seeding data from JSON file."""
        try:
            with open(self.tracker_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            # If file is corrupted or missing, recreate it
            self._ensure_tracker_file()
            with open(self.tracker_file, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    def _save_data(self, data: Dict[str, Any]):
        """Save seeding data to JSON file."""
        with open(self.tracker_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    def is_seeding_completed(self, seed_name: str, seed_version: str = "1.0.0") -> bool:
        """Check if a specific seeding operation has been completed."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        if seed_name not in operations:
            return False
        
        operation = operations[seed_name]
        return (
            operation.get("status") == "completed" and 
            operation.get("seed_version") == seed_version
        )
    
    def mark_seeding_started(self, seed_name: str, seed_version: str = "1.0.0", 
                           environment: str = "unknown", forced: bool = False) -> Dict[str, Any]:
        """Mark a seeding operation as started."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        operation = {
            "seed_name": seed_name,
            "seed_version": seed_version,
            "status": "running",
            "started_at": datetime.now().isoformat(),
            "completed_at": None,
            "environment": environment,
            "forced": forced,
            "records_created": 0,
            "records_updated": 0,
            "execution_time": None,
            "error_message": ""
        }
        
        operations[seed_name] = operation
        data["seeding_operations"] = operations
        self._save_data(data)
        
        return operation
    
    def mark_seeding_completed(self, seed_name: str, seed_version: str = "1.0.0",
                             records_created: int = 0, records_updated: int = 0,
                             execution_time: float = None) -> Dict[str, Any]:
        """Mark a seeding operation as completed."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        if seed_name in operations:
            operation = operations[seed_name]
            operation.update({
                "status": "completed",
                "completed_at": datetime.now().isoformat(),
                "records_created": records_created,
                "records_updated": records_updated,
                "execution_time": execution_time,
                "error_message": ""
            })
            
            # Calculate execution time if not provided
            if execution_time is None and operation.get("started_at"):
                try:
                    started = datetime.fromisoformat(operation["started_at"])
                    completed = datetime.fromisoformat(operation["completed_at"])
                    operation["execution_time"] = (completed - started).total_seconds()
                except:
                    pass
            
            operations[seed_name] = operation
            data["seeding_operations"] = operations
            self._save_data(data)
            
            return operation
        
        return {}
    
    def mark_seeding_failed(self, seed_name: str, error_message: str) -> Dict[str, Any]:
        """Mark a seeding operation as failed."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        if seed_name in operations:
            operation = operations[seed_name]
            operation.update({
                "status": "failed",
                "completed_at": datetime.now().isoformat(),
                "error_message": error_message
            })
            
            operations[seed_name] = operation
            data["seeding_operations"] = operations
            self._save_data(data)
            
            return operation
        
        return {}
    
    def clear_seeding_history(self, seed_name: str = None, force_clear: bool = False):
        """Clear seeding history. If seed_name provided, clear only that seed."""
        if not force_clear:
            print("⚠️  Use FORCE_RESEED=true environment variable to clear seeding history")
            return
        
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        if seed_name:
            if seed_name in operations:
                del operations[seed_name]
                print(f"🗑️  Cleared seeding history for: {seed_name}")
        else:
            operations.clear()
            print("🗑️  Cleared all seeding history")
        
        data["seeding_operations"] = operations
        self._save_data(data)
    
    def get_seeding_status(self) -> Dict[str, Any]:
        """Get overview of all seeding operations."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        status_counts = {
            "total": len(operations),
            "completed": 0,
            "failed": 0,
            "running": 0,
            "pending": 0
        }
        
        for operation in operations.values():
            status = operation.get("status", "pending")
            if status in status_counts:
                status_counts[status] += 1
        
        return {
            "overview": status_counts,
            "operations": operations,
            "tracker_file": str(self.tracker_file)
        }
    
    def list_completed_seeds(self) -> List[str]:
        """Get list of completed seed names."""
        data = self._load_data()
        operations = data.get("seeding_operations", {})
        
        return [
            name for name, op in operations.items() 
            if op.get("status") == "completed"
        ]
    
    def should_force_reseed(self) -> bool:
        """Check if FORCE_RESEED environment variable is set to true."""
        return os.getenv("FORCE_RESEED", "false").lower() == "true"


# Global instance
seeding_tracker = SeedingTracker()
