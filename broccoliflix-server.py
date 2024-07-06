import asyncio
import websockets
import logging
import sys
import ssl
import pathlib
from datetime import datetime

logging.basicConfig(level=logging.INFO)


class Actions:
    PLAY = 'play'
    STOP = 'pause'
    READY = 'ready'
    SET_NAME = 'set_name'
    NOT_READY = 'notready'
    CHANGE_TIME = 'changetime'


class VideoSyncServer:
    def __init__(self):
        self.clients = {}
        self.desired_state = Actions.PLAY

    # add client
    async def register(self, websocket, path):
        room = 'default' if len(path) == 0 else path
        self.clients[websocket] = {'ready': True, 'name': websocket.remote_address, 'room': room}
        logging.info(f"Client {self.clients[websocket]['name']} connected to room {room}")
        await websocket.send(f"{Actions.SET_NAME}:{self.clients[websocket]['name']}")

    # remove client
    async def unregister(self, websocket):
        self.clients.pop(websocket, None)
        logging.info(f"Client {websocket.remote_address} disconnected")

    # process message
    async def handle_message(self, websocket, message):
        async for message in websocket:
            logging.info(f"Message #{self.clients[websocket]['name']}: \"{message}\"")
            command = message.split(':')

            if command[0] == Actions.PLAY:
                self.desired_state = Actions.PLAY
                await self.broadcast(Actions.STOP, websocket)
                if self.check_all_clients_ready(websocket):
                    await self.broadcast(Actions.PLAY, websocket)
            elif command[0] == Actions.STOP:
                self.desired_state = Actions.STOP
                await self.broadcast_except_sender(Actions.STOP, websocket)
            elif command[0] == Actions.READY:
                # fixme: we don't stop source here, so we have a delay, but if we do
                #  we cannot see the buffering in browser (await websocket.send(Actions.STOP))
                self.clients[websocket]['ready'] = True
                if (self.desired_state == Actions.PLAY) and (self.check_all_clients_ready(websocket)):
                    await self.broadcast(Actions.PLAY, websocket)
            elif command[0] == Actions.NOT_READY:
                await self.broadcast_except_sender(Actions.STOP, websocket)
                self.clients[websocket]['ready'] = False
            elif command[0] == Actions.CHANGE_TIME:
                await self.broadcast_except_sender(Actions.CHANGE_TIME, websocket)

    # send message to everyone
    async def broadcast(self, message, websocket):
        room = self.clients[websocket]['room']
        tasks = [client.send(f"{message}:{datetime.now().isoformat()}") for client, details in self.clients.items() if
                 details['room'] == room]
        logging.info(f"broadcast_except_sender:{room}:\'{message}\'")
        if tasks:
            await asyncio.wait([asyncio.create_task(task) for task in tasks])

    # send message to everyone else
    async def broadcast_except_sender(self, message, websocket):
        room = self.clients[websocket]['room']
        tasks = [client.send(f"{message}:{datetime.now().isoformat()}") for client, details in self.clients.items() if
                 client != websocket and details['room'] == room]
        logging.info(f"broadcast_except_sender:{room}:\'{message}\'")
        if tasks:
            await asyncio.wait([asyncio.create_task(task) for task in tasks])

    def check_all_clients_ready(self, websocket):
        all(client['ready'] for client in self.clients.values() if
            client['room'] == self.clients[websocket]['room'])

    # processing for all messages
    async def video_sync(self, websocket, path):
        await self.register(websocket, path)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.ConnectionClosed as e:
            logging.info(f"Connection closed. Clients remain: {len(self.clients)}")
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
        finally:
            await self.unregister(websocket)


def create_ssl_context():
    base_path = pathlib.Path(__file__)
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(base_path.with_name("fullchain.crt"), base_path.with_name("privkey.key"))
    return ssl_context


async def start_server(server, use_ssl):
    ssl_context = create_ssl_context() if use_ssl else None
    port = 443 if use_ssl else 3000
    async with websockets.serve(server.video_sync, "", port, ssl=ssl_context):
        await asyncio.Future()


async def main():
    server = VideoSyncServer()
    await start_server(server, '--ssl' in sys.argv)


if __name__ == "__main__":
    asyncio.run(main())