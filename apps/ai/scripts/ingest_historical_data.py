import argparse
import asyncio
import logging
import os
import sys
from typing import List, Optional
from langchain_core.documents import Document
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Ensure apps/ai root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.services.vector_store import vector_store_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest_historical_data")


async def ingest_workspace_data(
    database_url: Optional[str] = None,
    target_workspace_id: Optional[str] = None,
) -> int:
    """
    Extracts historical projects and client context from PostgreSQL database,
    transforms them into LangChain Document vectors, and indexes them into ChromaDB.
    """
    settings = get_settings()
    db_url = database_url or settings.DATABASE_URL or os.environ.get("DATABASE_URL")

    if not db_url:
        logger.error("DATABASE_URL is required for database ingestion.")
        return 0

    # Ensure async driver prefix for SQLAlchemy
    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Normalize sslmode parameter for asyncpg
    if "sslmode=require" in db_url:
        db_url = db_url.replace("sslmode=require", "ssl=require")

    logger.info("Connecting to database for historical project extraction...")
    engine = create_async_engine(
        db_url,
        pool_pre_ping=True,
        pool_recycle=300,
    )

    query_filter = ""
    params = {}
    if target_workspace_id:
        query_filter = "AND p.workspace_id = :workspace_id"
        params["workspace_id"] = target_workspace_id

    sql_query = text(f"""
        SELECT 
            p.id as project_id,
            p.workspace_id,
            p.name as project_name,
            p.slug as project_slug,
            p.description as project_description,
            p.status as project_status,
            p.pricing_model,
            p.budget_currency,
            p.budget_amount,
            p.start_date,
            p.target_date,
            c.name as client_name,
            c.company_name as client_company,
            c.department as client_department
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.deleted_at IS NULL {query_filter}
        ORDER BY p.created_at DESC
    """)

    documents_by_workspace: dict[str, List[Document]] = {}

    async with engine.connect() as conn:
        result = await conn.execute(sql_query, params)
        rows = result.mappings().all()

        logger.info(f"Retrieved {len(rows)} projects from database.")

        for row in rows:
            ws_id = str(row["workspace_id"])
            proj_name = row["project_name"] or "Unnamed Project"
            proj_desc = row["project_description"] or "No detailed description provided."
            client_name = row["client_name"] or "Independent Client"
            company = f" ({row['client_company']})" if row["client_company"] else ""
            budget = f"{row['budget_amount']} {row['budget_currency']}" if row["budget_amount"] else "Variable / Hourly"
            pricing = row["pricing_model"] or "fixed"
            timeline = f"Target duration: {row['start_date']} to {row['target_date']}" if row["start_date"] and row["target_date"] else "Standard delivery cycle"

            page_content = (
                f"Historical Project: {proj_name}\n"
                f"Client: {client_name}{company}\n"
                f"Pricing Model: {pricing} | Budget: {budget}\n"
                f"Timeline: {timeline}\n"
                f"Description & Scope: {proj_desc}"
            )

            doc = Document(
                page_content=page_content,
                metadata={
                    "workspace_id": ws_id,
                    "projectId": str(row["project_id"]),
                    "title": proj_name,
                    "type": "project",
                    "pricing_model": pricing,
                },
            )

            if ws_id not in documents_by_workspace:
                documents_by_workspace[ws_id] = []
            documents_by_workspace[ws_id].append(doc)

    await engine.dispose()

    total_indexed = 0
    for ws_id, docs in documents_by_workspace.items():
        indexed_ids = vector_store_service.add_documents(
            workspace_id=ws_id,
            documents=docs,
        )
        total_indexed += len(indexed_ids)
        logger.info(f"Indexed {len(indexed_ids)} documents into Chroma for workspace {ws_id}.")

    return total_indexed


def main():
    parser = argparse.ArgumentParser(description="Ingest historical PostgreSQL projects into Chroma Vector Store.")
    parser.add_argument("--workspace-id", type=str, help="Specific workspace ID to filter ingestion", default=None)
    parser.add_argument("--database-url", type=str, help="PostgreSQL connection string override", default=None)
    args = parser.parse_args()

    total = asyncio.run(ingest_workspace_data(
        database_url=args.database_url,
        target_workspace_id=args.workspace_id,
    ))
    print(f"Historical data ingestion complete. Total documents indexed: {total}")


if __name__ == "__main__":
    main()
