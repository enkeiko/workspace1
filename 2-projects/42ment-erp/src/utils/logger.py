"""
Structured JSON logging utility
"""
import logging
import json
import os
from datetime import datetime
from pathlib import Path


def get_log_path():
    """Get absolute path to log directory"""
    project_root = Path(__file__).parent.parent.parent
    log_dir = project_root / "data" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def setup_logger(name='42ment-erp', level=logging.INFO):
    """
    Setup structured JSON logger

    Args:
        name (str): Logger name
        level: Logging level

    Returns:
        logging.Logger: Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Remove existing handlers
    logger.handlers = []

    # Create log file path with date
    log_dir = get_log_path()
    log_file = log_dir / f"app_{datetime.now().strftime('%Y%m%d')}.log"

    # File handler with JSON format
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(level)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)

    # Simple format for console
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(console_format)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


def log_json(logger, level, message, **kwargs):
    """
    Log structured JSON message

    Args:
        logger: Logger instance
        level: Log level (INFO, ERROR, etc.)
        message: Log message
        **kwargs: Additional fields to include in JSON
    """
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'level': level,
        'message': message,
        **kwargs
    }

    json_str = json.dumps(log_data, ensure_ascii=False)

    if level == 'INFO':
        logger.info(json_str)
    elif level == 'ERROR':
        logger.error(json_str)
    elif level == 'WARNING':
        logger.warning(json_str)
    elif level == 'DEBUG':
        logger.debug(json_str)


# Default logger instance
default_logger = setup_logger()


def log_info(message, **kwargs):
    """Log INFO level message"""
    log_json(default_logger, 'INFO', message, **kwargs)


def log_error(message, **kwargs):
    """Log ERROR level message"""
    log_json(default_logger, 'ERROR', message, **kwargs)


def log_warning(message, **kwargs):
    """Log WARNING level message"""
    log_json(default_logger, 'WARNING', message, **kwargs)


def log_debug(message, **kwargs):
    """Log DEBUG level message"""
    log_json(default_logger, 'DEBUG', message, **kwargs)
