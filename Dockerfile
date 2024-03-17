FROM python:3.10.11-slim
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY broccoliflix-server.py /app/broccoliflix-server.py
WORKDIR /app
CMD ["python", "broccoliflix-server.py"]