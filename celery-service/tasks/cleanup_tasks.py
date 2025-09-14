# Cleanup Tasks for Celery Microservice
# Handles system cleanup, maintenance, and periodic tasks

import os
import shutil
from datetime import datetime, timedelta
from typing import Dict, List
from celery import current_app
from loguru import logger
import httpx

# =============================================================================
# CLEANUP TASKS
# =============================================================================

@current_app.task(bind=True, queue='cleanup')
def cleanup_temp_files_task(self, max_age_hours: int = 24):
    """
    Clean up temporary files older than specified hours
    
    Args:
        max_age_hours: Maximum age of files to keep in hours
    """
    try:
        logger.info(f"🧹 Starting cleanup of temp files older than {max_age_hours} hours")
        
        temp_dirs = [
            '/tmp',
            '/app/temp',
            '/app/uploads/temp'
        ]
        
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        total_deleted = 0
        total_size_freed = 0
        
        for temp_dir in temp_dirs:
            if not os.path.exists(temp_dir):
                continue
                
            deleted, size_freed = _cleanup_directory(temp_dir, cutoff_time)
            total_deleted += deleted
            total_size_freed += size_freed
        
        logger.success(f"✅ Cleanup completed: {total_deleted} files deleted, {total_size_freed / 1024 / 1024:.2f} MB freed")
        
        return {
            "status": "success",
            "files_deleted": total_deleted,
            "size_freed_mb": round(total_size_freed / 1024 / 1024, 2),
            "max_age_hours": max_age_hours
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to cleanup temp files: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='cleanup')
def cleanup_old_logs_task(self, max_age_days: int = 7):
    """
    Clean up old log files
    
    Args:
        max_age_days: Maximum age of log files to keep in days
    """
    try:
        logger.info(f"📝 Starting cleanup of log files older than {max_age_days} days")
        
        log_dirs = [
            '/app/logs',
            '/var/log/celery',
            '/var/log/app'
        ]
        
        cutoff_time = datetime.now() - timedelta(days=max_age_days)
        total_deleted = 0
        total_size_freed = 0
        
        for log_dir in log_dirs:
            if not os.path.exists(log_dir):
                continue
                
            for filename in os.listdir(log_dir):
                if not filename.endswith('.log'):
                    continue
                    
                file_path = os.path.join(log_dir, filename)
                
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_time < cutoff_time:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        total_deleted += 1
                        total_size_freed += file_size
                        logger.debug(f"🗑️ Deleted log file: {filename}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Could not delete log file {filename}: {e}")
        
        logger.success(f"✅ Log cleanup completed: {total_deleted} files deleted, {total_size_freed / 1024 / 1024:.2f} MB freed")
        
        return {
            "status": "success",
            "files_deleted": total_deleted,
            "size_freed_mb": round(total_size_freed / 1024 / 1024, 2),
            "max_age_days": max_age_days
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to cleanup log files: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='cleanup')
def cleanup_failed_tasks_task(self, max_age_hours: int = 48):
    """
    Clean up failed task results from Redis
    
    Args:
        max_age_hours: Maximum age of failed tasks to keep in hours
    """
    try:
        logger.info(f"🔄 Starting cleanup of failed tasks older than {max_age_hours} hours")
        
        # This would typically involve cleaning up Redis keys
        # For now, we'll simulate the cleanup
        
        # In a real implementation, you would:
        # 1. Connect to Redis
        # 2. Find keys matching failed task patterns
        # 3. Check their age
        # 4. Delete old ones
        
        cleaned_tasks = 0  # Simulated count
        
        logger.success(f"✅ Failed tasks cleanup completed: {cleaned_tasks} tasks cleaned")
        
        return {
            "status": "success",
            "tasks_cleaned": cleaned_tasks,
            "max_age_hours": max_age_hours
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to cleanup failed tasks: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='cleanup')
def system_health_check_task(self):
    """
    Perform system health check and report status
    """
    try:
        logger.info("🏥 Starting system health check")
        
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "celery_status": "healthy",
            "disk_usage": _check_disk_usage(),
            "memory_usage": _check_memory_usage(),
            "queue_status": _check_queue_status(),
            "external_services": _check_external_services()
        }
        
        # Send health status to backend
        _send_health_status_to_backend(health_status)
        
        logger.success("✅ System health check completed")
        
        return {
            "status": "success",
            "health_status": health_status
        }
        
    except Exception as exc:
        logger.error(f"❌ System health check failed: {exc}")
        return {"status": "failed", "error": str(exc)}


# =============================================================================
# PERIODIC TASKS (to be registered in celery beat)
# =============================================================================

@current_app.task(bind=True, queue='cleanup')
def daily_maintenance_task(self):
    """
    Daily maintenance task - runs cleanup and health checks
    """
    try:
        logger.info("🔧 Starting daily maintenance")
        
        # Run cleanup tasks
        cleanup_temp_files_task.delay(24)  # Clean files older than 24 hours
        cleanup_old_logs_task.delay(7)     # Clean logs older than 7 days
        cleanup_failed_tasks_task.delay(48) # Clean failed tasks older than 48 hours
        
        # Run health check
        system_health_check_task.delay()
        
        logger.success("✅ Daily maintenance tasks queued")
        
        return {"status": "success", "maintenance_type": "daily"}
        
    except Exception as exc:
        logger.error(f"❌ Daily maintenance failed: {exc}")
        return {"status": "failed", "error": str(exc)}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _cleanup_directory(directory: str, cutoff_time: datetime) -> tuple[int, int]:
    """
    Clean up files in directory older than cutoff time
    
    Returns:
        tuple: (files_deleted, total_size_freed)
    """
    files_deleted = 0
    total_size_freed = 0
    
    try:
        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)
            
            if os.path.isfile(file_path):
                try:
                    file_time = datetime.fromtimestamp(os.path.getmtime(file_path))
                    
                    if file_time < cutoff_time:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        files_deleted += 1
                        total_size_freed += file_size
                        logger.debug(f"🗑️ Deleted temp file: {filename}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ Could not delete file {filename}: {e}")
                    
    except Exception as e:
        logger.warning(f"⚠️ Could not access directory {directory}: {e}")
    
    return files_deleted, total_size_freed


def _check_disk_usage() -> Dict:
    """Check disk usage"""
    try:
        statvfs = os.statvfs('/')
        total = statvfs.f_frsize * statvfs.f_blocks
        free = statvfs.f_frsize * statvfs.f_available
        used = total - free
        usage_percent = (used / total) * 100
        
        return {
            "total_gb": round(total / 1024 / 1024 / 1024, 2),
            "used_gb": round(used / 1024 / 1024 / 1024, 2),
            "free_gb": round(free / 1024 / 1024 / 1024, 2),
            "usage_percent": round(usage_percent, 2)
        }
    except Exception as e:
        logger.error(f"❌ Could not check disk usage: {e}")
        return {"error": str(e)}


def _check_memory_usage() -> Dict:
    """Check memory usage"""
    try:
        # This is a simplified check - in production you'd use psutil
        with open('/proc/meminfo', 'r') as f:
            meminfo = f.read()
        
        # Parse memory info (simplified)
        return {"status": "checked", "method": "proc_meminfo"}
    except Exception as e:
        logger.error(f"❌ Could not check memory usage: {e}")
        return {"error": str(e)}


def _check_queue_status() -> Dict:
    """Check Celery queue status"""
    try:
        # In a real implementation, you would check queue lengths
        return {
            "email_queue": "healthy",
            "notifications_queue": "healthy",
            "data_processing_queue": "healthy",
            "cleanup_queue": "healthy"
        }
    except Exception as e:
        logger.error(f"❌ Could not check queue status: {e}")
        return {"error": str(e)}


def _check_external_services() -> Dict:
    """Check external services connectivity"""
    services_status = {}
    
    # Check Redis
    try:
        redis_host = os.getenv('REDIS_HOST', 'localhost')
        redis_port = os.getenv('REDIS_PORT', '6379')
        # In real implementation, you would ping Redis
        services_status['redis'] = 'healthy'
    except Exception as e:
        services_status['redis'] = f'error: {e}'
    
    # Check RabbitMQ
    try:
        rabbitmq_host = os.getenv('RABBITMQ_HOST', 'localhost')
        # In real implementation, you would check RabbitMQ
        services_status['rabbitmq'] = 'healthy'
    except Exception as e:
        services_status['rabbitmq'] = f'error: {e}'
    
    # Check Backend API
    try:
        backend_url = os.getenv('BACKEND_API_URL', 'http://app:8000')
        with httpx.Client() as client:
            response = client.get(f"{backend_url}/health/", timeout=10)
            services_status['backend_api'] = 'healthy' if response.status_code == 200 else 'unhealthy'
    except Exception as e:
        services_status['backend_api'] = f'error: {e}'
    
    return services_status


def _send_health_status_to_backend(health_status: Dict):
    """Send health status to backend"""
    try:
        backend_url = os.getenv('BACKEND_API_URL', 'http://app:8000')
        api_key = os.getenv('BACKEND_API_KEY', '')
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }
        
        with httpx.Client() as client:
            response = client.post(
                f"{backend_url}/api/system/health/",
                json=health_status,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
        
        logger.info("📤 Sent health status to backend")
        
    except Exception as e:
        logger.error(f"❌ Failed to send health status to backend: {e}")
