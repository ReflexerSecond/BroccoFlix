FROM python:3.12

WORKDIR /app

COPY ./server /app/server

RUN pip install websockets

CMD ["python", "server/ServerLauncher.py", "--ssl"]
