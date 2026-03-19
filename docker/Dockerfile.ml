FROM python:3.12-slim

WORKDIR /app

COPY packages/ml/src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ml/src/ ./src/
COPY packages/ml/src/models/ ./models/

EXPOSE 8000

CMD ["uvicorn", "src.serving.server:app", "--host", "0.0.0.0", "--port", "8000"]
