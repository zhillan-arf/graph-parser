"""FastAPI server for Knowledge Graph API."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.db.factory import create_database_adapter
from src.routes.graphs import router as graphs_router

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup: Initialize database
    db = create_database_adapter()
    await db.initialize()
    app.state.db = db

    yield

    # Shutdown: Close database
    await db.close()


# Create FastAPI app
app = FastAPI(
    title="Knowledge Graph API",
    description="API for managing knowledge graphs with courses, topics, and prerequisites",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(graphs_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "3334"))
    uvicorn.run("src.main:app", host="0.0.0.0", port=port, reload=True)
