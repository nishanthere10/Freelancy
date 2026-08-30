# Freelance OS — AI Service

FastAPI Python microservice providing AI scope analysis, project intelligence, and vector search.

## Setup & Running

1. **Activate Virtual Environment:**
   ```bash
   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies:**
   ```bash
   pip install -e .[dev]
   ```

3. **Run Dev Server:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

4. **Run Tests:**
   ```bash
   pytest
   ```
