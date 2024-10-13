FROM python:3.12
WORKDIR /app
COPY ./server /app/server
RUN pip install websockets
EXPOSE 80 443
CMD ["python", "server/ServerLauncher.py", "--ssl"]
