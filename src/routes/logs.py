"""
Logs Management Routes

Provides endpoints for:
- Querying logs
- Analyzing logs
- Exporting logs
- Log statistics

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
import os
from pathlib import Path

from src.middleware.auth import require_auth

logs_bp = APIRouter(prefix="/api/logs", tags=["Logs"])

logger = logging.getLogger(__name__)


class LogAnalyzer:
    """Analyzes log files"""
    
    def __init__(self, log_dir: str = 'logs'):
        self.log_dir = log_dir
    
    def read_log_file(
        self,
        filename: str,
        limit: int = 100,
        offset: int = 0,
        level: Optional[str] = None
    ) -> List[Dict]:
        """
        Read log file and return entries
        
        Args:
            filename: Log file name
            limit: Maximum number of entries
            offset: Starting offset
            level: Filter by log level
        
        Returns:
            List of log entries
        """
        filepath = os.path.join(self.log_dir, filename)
        
        if not os.path.exists(filepath):
            return []
        
        entries = []
        
        try:
            with open(filepath, 'r') as f:
                lines = f.readlines()
            
            # Process lines in reverse (newest first)
            for line in reversed(lines):
                try:
                    import json
                    entry = json.loads(line.strip())
                    
                    # Filter by level if specified
                    if level and entry.get('level') != level.upper():
                        continue
                    
                    entries.append(entry)
                    
                    if len(entries) >= limit + offset:
                        break
                except json.JSONDecodeError:
                    continue
            
            # Apply offset
            return entries[offset:offset + limit]
        
        except Exception as e:
            logger.error(f"Error reading log file {filename}: {str(e)}")
            return []
    
    def get_log_statistics(self, filename: str) -> Dict:
        """
        Get statistics for a log file
        
        Args:
            filename: Log file name
        
        Returns:
            Dictionary with statistics
        """
        filepath = os.path.join(self.log_dir, filename)
        
        if not os.path.exists(filepath):
            return {}
        
        stats = {
            'filename': filename,
            'total_entries': 0,
            'by_level': {},
            'by_module': {},
            'errors': 0,
            'warnings': 0,
            'file_size_bytes': 0,
            'last_updated': None
        }
        
        try:
            # Get file stats
            file_stat = os.stat(filepath)
            stats['file_size_bytes'] = file_stat.st_size
            stats['last_updated'] = datetime.fromtimestamp(file_stat.st_mtime).isoformat()
            
            # Parse entries
            with open(filepath, 'r') as f:
                for line in f:
                    try:
                        import json
                        entry = json.loads(line.strip())
                        
                        stats['total_entries'] += 1
                        
                        # Count by level
                        level = entry.get('level', 'UNKNOWN')
                        stats['by_level'][level] = stats['by_level'].get(level, 0) + 1
                        
                        if level == 'ERROR':
                            stats['errors'] += 1
                        elif level == 'WARNING':
                            stats['warnings'] += 1
                        
                        # Count by module
                        module = entry.get('module', 'unknown')
                        stats['by_module'][module] = stats['by_module'].get(module, 0) + 1
                    
                    except json.JSONDecodeError:
                        continue
        
        except Exception as e:
            logger.error(f"Error analyzing log file {filename}: {str(e)}")
        
        return stats
    
    def search_logs(
        self,
        filename: str,
        keyword: str,
        limit: int = 50
    ) -> List[Dict]:
        """
        Search logs for keyword
        
        Args:
            filename: Log file name
            keyword: Search keyword
            limit: Maximum results
        
        Returns:
            List of matching entries
        """
        filepath = os.path.join(self.log_dir, filename)
        
        if not os.path.exists(filepath):
            return []
        
        results = []
        keyword_lower = keyword.lower()
        
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    try:
                        import json
                        entry = json.loads(line.strip())
                        
                        # Search in message and other fields
                        entry_str = json.dumps(entry).lower()
                        
                        if keyword_lower in entry_str:
                            results.append(entry)
                            
                            if len(results) >= limit:
                                break
                    
                    except json.JSONDecodeError:
                        continue
        
        except Exception as e:
            logger.error(f"Error searching logs: {str(e)}")
        
        return results
    
    def get_error_summary(self, filename: str, hours: int = 24) -> Dict:
        """
        Get summary of errors in the last N hours
        
        Args:
            filename: Log file name
            hours: Number of hours to look back
        
        Returns:
            Dictionary with error summary
        """
        filepath = os.path.join(self.log_dir, filename)
        
        if not os.path.exists(filepath):
            return {}
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        errors = []
        
        try:
            with open(filepath, 'r') as f:
                for line in f:
                    try:
                        import json
                        entry = json.loads(line.strip())
                        
                        if entry.get('level') != 'ERROR':
                            continue
                        
                        # Parse timestamp
                        try:
                            entry_time = datetime.fromisoformat(entry.get('timestamp', ''))
                            if entry_time < cutoff_time:
                                continue
                        except:
                            pass
                        
                        errors.append(entry)
                    
                    except json.JSONDecodeError:
                        continue
        
        except Exception as e:
            logger.error(f"Error getting error summary: {str(e)}")
        
        # Group by error type
        error_groups = {}
        for error in errors:
            error_type = error.get('exception', {}).get('type', 'Unknown')
            if error_type not in error_groups:
                error_groups[error_type] = []
            error_groups[error_type].append(error)
        
        return {
            'hours': hours,
            'total_errors': len(errors),
            'error_groups': {
                error_type: len(entries)
                for error_type, entries in error_groups.items()
            },
            'errors': errors[-10:]  # Last 10 errors
        }


# Global analyzer instance
log_analyzer = LogAnalyzer()


# API Endpoints

@logs_bp.get('/files')
async def list_log_files(current_user: dict = Depends(require_auth)):
    """
    List available log files
    
    Returns:
        JSON response with log files
    """
    try:
        log_dir = 'logs'
        
        if not os.path.exists(log_dir):
            return {
                'success': True,
                'files': [],
                'timestamp': datetime.utcnow().isoformat()
            }
        
        files = []
        for filename in os.listdir(log_dir):
            filepath = os.path.join(log_dir, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    'filename': filename,
                    'size_bytes': stat.st_size,
                    'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return {
            'success': True,
            'files': files,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error listing log files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to list log files: {str(e)}'
        )


@logs_bp.get('/{filename}')
async def get_logs(
    filename: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    level: Optional[str] = Query(None),
    current_user: dict = Depends(require_auth)
):
    """
    Get log entries from file
    
    Path Parameters:
        filename: Log file name
    
    Query Parameters:
        limit: Maximum number of entries
        offset: Starting offset
        level: Filter by log level (DEBUG, INFO, WARNING, ERROR)
    
    Returns:
        JSON response with log entries
    """
    try:
        entries = log_analyzer.read_log_file(filename, limit, offset, level)
        
        return {
            'success': True,
            'filename': filename,
            'entries': entries,
            'count': len(entries),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get logs: {str(e)}'
        )


@logs_bp.get('/{filename}/stats')
async def get_log_statistics(
    filename: str,
    current_user: dict = Depends(require_auth)
):
    """
    Get statistics for a log file
    
    Path Parameters:
        filename: Log file name
    
    Returns:
        JSON response with statistics
    """
    try:
        stats = log_analyzer.get_log_statistics(filename)
        
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Log file not found'
            )
        
        return {
            'success': True,
            'stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting log statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get statistics: {str(e)}'
        )


@logs_bp.get('/{filename}/search')
async def search_logs(
    filename: str,
    keyword: str = Query(...),
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_auth)
):
    """
    Search logs for keyword
    
    Path Parameters:
        filename: Log file name
    
    Query Parameters:
        keyword: Search keyword
        limit: Maximum results
    
    Returns:
        JSON response with search results
    """
    try:
        results = log_analyzer.search_logs(filename, keyword, limit)
        
        return {
            'success': True,
            'filename': filename,
            'keyword': keyword,
            'results': results,
            'count': len(results),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error searching logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to search logs: {str(e)}'
        )


@logs_bp.get('/{filename}/errors')
async def get_error_summary(
    filename: str,
    hours: int = Query(24, ge=1, le=720),
    current_user: dict = Depends(require_auth)
):
    """
    Get error summary for a log file
    
    Path Parameters:
        filename: Log file name
    
    Query Parameters:
        hours: Number of hours to look back
    
    Returns:
        JSON response with error summary
    """
    try:
        summary = log_analyzer.get_error_summary(filename, hours)
        
        return {
            'success': True,
            'filename': filename,
            'summary': summary,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting error summary: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get error summary: {str(e)}'
        )
