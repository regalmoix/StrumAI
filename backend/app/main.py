import logging
import time
from collections.abc import AsyncIterator
from collections.abc import Awaitable
from collections.abc import Callable
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI
from fastapi import Request
from fastapi import Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.routes.skus import router as skus_router

logfire.configure(send_to_logfire=False)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="\033[%(color)sm%(levelname)-8s\033[0m %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
_COLOR_MAP = {"DEBUG": "36", "INFO": "32", "WARNING": "33", "ERROR": "31", "CRITICAL": "31"}


class ColoredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        record.color = _COLOR_MAP.get(record.levelname, "0")
        return super().format(record)


handler = logging.StreamHandler()
handler.setFormatter(
    ColoredFormatter(
        fmt="\033[%(color)sm%(levelname)-8s\033[0m %(name)s — %(message)s",
        datefmt="%H:%M:%S",
    )
)
root_logger = logging.getLogger()
root_logger.handlers = [handler]
root_logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

logger = logging.getLogger("strumai.app")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting Demand Planning API (env=%s)", settings.environment)
    yield
    logger.info("Shutting down Demand Planning API")


app = FastAPI(
    title="Demand Planning API",
    version="0.1.0",
    docs_url="/api/docs" if settings.environment == "development" else None,
    redoc_url="/api/redoc" if settings.environment == "development" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.middleware("http")
async def request_logging(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    if request.url.path.startswith("/api"):
        logger.info("%s %s → %d (%.1fms)", request.method, request.url.path, response.status_code, elapsed_ms)
    return response


app.include_router(skus_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}


if settings.frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=str(settings.frontend_dist), html=True), name="frontend")
    logger.info("Serving frontend static files from %s", settings.frontend_dist)
