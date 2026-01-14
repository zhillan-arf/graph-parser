"""Pytest configuration and fixtures."""

import os
import tempfile
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

from src.db.adapters.sqlite import SQLiteAdapter
from src.main import app


@pytest.fixture
async def db() -> AsyncGenerator[SQLiteAdapter, None]:
    """Create a temporary database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    adapter = SQLiteAdapter(db_path=db_path)
    await adapter.initialize()

    yield adapter

    await adapter.close()
    os.unlink(db_path)


@pytest.fixture
async def client(db: SQLiteAdapter) -> AsyncGenerator[AsyncClient, None]:
    """Create an async HTTP client for testing the API."""
    app.state.db = db

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
