"""Database adapter factory."""

import os
from typing import Optional

from src.db.adapters.sqlite import SQLiteAdapter
from src.db.types import DatabaseAdapter


def create_database_adapter(
    db_type: Optional[str] = None,
    data_dir: Optional[str] = None,
    kg_db_file: Optional[str] = None,
    scraper_db_file: Optional[str] = None,
) -> DatabaseAdapter:
    """Create a database adapter based on configuration.

    Args:
        db_type: Type of database ('sqlite' or 'postgres'). Defaults to env DB_TYPE or 'sqlite'.
        data_dir: Directory for database files. Defaults to env DATA_DIR or './data'.
        kg_db_file: Knowledge graphs database filename. Defaults to env KG_DB_FILE or 'knowledge_graphs.db'.
        scraper_db_file: Scraper database filename. Defaults to env SCRAPER_DB_FILE or 'graph.db'.

    Returns:
        DatabaseAdapter: The configured database adapter.

    Raises:
        ValueError: If an unsupported database type is specified.
    """
    db_type = db_type or os.getenv("DB_TYPE", "sqlite")
    data_dir = data_dir or os.getenv("DATA_DIR", "./data")
    kg_db_file = kg_db_file or os.getenv("KG_DB_FILE", "knowledge_graphs.db")
    scraper_db_file = scraper_db_file or os.getenv("SCRAPER_DB_FILE", "graph.db")

    if db_type == "sqlite":
        db_path = os.path.join(data_dir, kg_db_file)
        scraper_path = os.path.join(data_dir, scraper_db_file)
        return SQLiteAdapter(db_path=db_path, scraper_db_path=scraper_path)
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
