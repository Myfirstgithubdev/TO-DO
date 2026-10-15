FROM python:3.12-slim

WORKDIR /app

ENV PYTHONONTOWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY Frontend ./Frontend

ENV TODO_DB_PATH=/data/todos.db

RUN mkdir -p /data