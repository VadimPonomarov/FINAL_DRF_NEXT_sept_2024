# Data Processing Tasks for Celery Microservice
# Handles data processing, file operations, and analytics

import os
import json
from typing import Dict, List, Any
from celery import current_app
from loguru import logger
import httpx

# =============================================================================
# DATA PROCESSING TASKS
# =============================================================================

@current_app.task(bind=True, queue='data_processing', max_retries=2)
def process_user_data_task(self, user_id: int, data_type: str, data: Dict):
    """
    Process user data task
    
    Args:
        user_id: User ID
        data_type: Type of data to process
        data: Data to process
    """
    try:
        logger.info(f"🔄 Processing {data_type} data for user {user_id}")
        
        # Process different types of data
        if data_type == 'profile_update':
            result = _process_profile_update(user_id, data)
        elif data_type == 'activity_log':
            result = _process_activity_log(user_id, data)
        elif data_type == 'analytics':
            result = _process_analytics_data(user_id, data)
        else:
            raise ValueError(f"Unknown data type: {data_type}")
        
        # Send result back to backend
        _send_processing_result_to_backend(user_id, data_type, result)
        
        logger.success(f"✅ Processed {data_type} data for user {user_id}")
        return {"status": "success", "user_id": user_id, "data_type": data_type, "result": result}
        
    except Exception as exc:
        logger.error(f"❌ Failed to process data for user {user_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60 * (2 ** self.request.retries))
        
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='data_processing')
def generate_report_task(self, report_type: str, filters: Dict, user_id: int):
    """
    Generate report task
    
    Args:
        report_type: Type of report to generate
        filters: Report filters
        user_id: User requesting the report
    """
    try:
        logger.info(f"📊 Generating {report_type} report for user {user_id}")
        
        # Generate report based on type
        if report_type == 'user_activity':
            report_data = _generate_user_activity_report(filters)
        elif report_type == 'system_stats':
            report_data = _generate_system_stats_report(filters)
        elif report_type == 'financial':
            report_data = _generate_financial_report(filters)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
        
        # Save report and notify user
        report_id = _save_report(report_type, report_data, user_id)
        _notify_report_ready(user_id, report_id, report_type)
        
        logger.success(f"✅ Generated {report_type} report (ID: {report_id}) for user {user_id}")
        return {
            "status": "success",
            "report_id": report_id,
            "report_type": report_type,
            "user_id": user_id
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to generate report: {exc}")
        return {"status": "failed", "error": str(exc)}


@current_app.task(bind=True, queue='data_processing')
def batch_data_import_task(self, file_path: str, import_type: str, user_id: int):
    """
    Batch data import task
    
    Args:
        file_path: Path to the file to import
        import_type: Type of import (csv, json, xml)
        user_id: User who initiated the import
    """
    try:
        logger.info(f"📥 Starting batch import of {import_type} file: {file_path}")
        
        # Process file based on type
        if import_type == 'csv':
            result = _process_csv_import(file_path)
        elif import_type == 'json':
            result = _process_json_import(file_path)
        elif import_type == 'xml':
            result = _process_xml_import(file_path)
        else:
            raise ValueError(f"Unsupported import type: {import_type}")
        
        # Send import results to backend
        _send_import_results_to_backend(user_id, file_path, result)
        
        logger.success(f"✅ Completed batch import: {result['processed']} records processed")
        return {
            "status": "success",
            "file_path": file_path,
            "import_type": import_type,
            "result": result
        }
        
    except Exception as exc:
        logger.error(f"❌ Failed to import file {file_path}: {exc}")
        return {"status": "failed", "error": str(exc)}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _process_profile_update(user_id: int, data: Dict) -> Dict:
    """Process profile update data"""
    # Simulate profile processing
    processed_fields = []
    for field, value in data.items():
        # Add validation, transformation logic here
        processed_fields.append(field)
    
    return {
        "processed_fields": processed_fields,
        "timestamp": "2025-08-10T13:30:00Z"
    }


def _process_activity_log(user_id: int, data: Dict) -> Dict:
    """Process activity log data"""
    # Simulate activity processing
    return {
        "activities_processed": len(data.get('activities', [])),
        "timestamp": "2025-08-10T13:30:00Z"
    }


def _process_analytics_data(user_id: int, data: Dict) -> Dict:
    """Process analytics data"""
    # Simulate analytics processing
    return {
        "metrics_calculated": len(data.get('metrics', [])),
        "timestamp": "2025-08-10T13:30:00Z"
    }


def _send_processing_result_to_backend(user_id: int, data_type: str, result: Dict):
    """Send processing result back to backend"""
    try:
        backend_url = os.getenv('BACKEND_API_URL', 'http://app:8000')
        api_key = os.getenv('BACKEND_API_KEY', '')
        
        payload = {
            'user_id': user_id,
            'data_type': data_type,
            'result': result,
            'source': 'celery-microservice'
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }
        
        with httpx.Client() as client:
            response = client.post(
                f"{backend_url}/api/data-processing/results/",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
        
        logger.info(f"📤 Sent processing result to backend for user {user_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send result to backend: {e}")


def _generate_user_activity_report(filters: Dict) -> Dict:
    """Generate user activity report"""
    # Simulate report generation
    return {
        "total_users": 1000,
        "active_users": 750,
        "period": filters.get('period', '30d')
    }


def _generate_system_stats_report(filters: Dict) -> Dict:
    """Generate system statistics report"""
    return {
        "cpu_usage": "65%",
        "memory_usage": "45%",
        "disk_usage": "30%"
    }


def _generate_financial_report(filters: Dict) -> Dict:
    """Generate financial report"""
    return {
        "total_revenue": 50000,
        "total_expenses": 30000,
        "profit": 20000
    }


def _save_report(report_type: str, data: Dict, user_id: int) -> str:
    """Save report and return report ID"""
    # Simulate saving report
    report_id = f"report_{report_type}_{user_id}_{int(os.urandom(4).hex(), 16)}"
    return report_id


def _notify_report_ready(user_id: int, report_id: str, report_type: str):
    """Notify user that report is ready"""
    from .email_tasks import send_notification_to_backend
    
    send_notification_to_backend.delay(
        user_id,
        'report_ready',
        {
            'report_id': report_id,
            'report_type': report_type
        }
    )


def _process_csv_import(file_path: str) -> Dict:
    """Process CSV import"""
    # Simulate CSV processing
    return {"processed": 100, "errors": 0, "format": "csv"}


def _process_json_import(file_path: str) -> Dict:
    """Process JSON import"""
    # Simulate JSON processing
    return {"processed": 50, "errors": 0, "format": "json"}


def _process_xml_import(file_path: str) -> Dict:
    """Process XML import"""
    # Simulate XML processing
    return {"processed": 75, "errors": 2, "format": "xml"}


def _send_import_results_to_backend(user_id: int, file_path: str, result: Dict):
    """Send import results to backend"""
    try:
        backend_url = os.getenv('BACKEND_API_URL', 'http://app:8000')
        api_key = os.getenv('BACKEND_API_KEY', '')
        
        payload = {
            'user_id': user_id,
            'file_path': file_path,
            'result': result,
            'source': 'celery-microservice'
        }
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}' if api_key else ''
        }
        
        with httpx.Client() as client:
            response = client.post(
                f"{backend_url}/api/data-import/results/",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
        
        logger.info(f"📤 Sent import results to backend for user {user_id}")
        
    except Exception as e:
        logger.error(f"❌ Failed to send import results to backend: {e}")
