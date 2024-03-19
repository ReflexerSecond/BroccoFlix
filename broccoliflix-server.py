import asyncio
import websockets
import logging
import sys
import ssl
import pathlib

logging.basicConfig(level=logging.INFO)


class Actions:
    PLAY = 'play'
    STOP = 'pause'
    READY = 'ready'
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

    # remove client
    async def unregister(self, websocket):
        self.clients.pop(websocket, None)
        logging.info(f"Client {websocket.remote_address} disconnected")

    # process message
    async def handle_message(self, websocket, message):
        async for message in websocket:
            print(f"Message #{self.clients[websocket]['name']}: \"{message}\"")
            comand = message.split(':')
            are_all_ready = lambda: all(client['ready'] for client in self.clients.values() if
                                        client['room'] == self.clients[websocket]['room'])

            if comand[0] == Actions.PLAY:
                self.desired_state = Actions.PLAY
                await self.broadcast(Actions.STOP, websocket)
                if are_all_ready():
                    await self.broadcast(Actions.PLAY, websocket)
            elif comand[0] == Actions.STOP:
                self.desired_state = Actions.STOP
                await self.broadcast_except_sender(Actions.STOP, websocket)
            elif comand[0] == Actions.READY:
                # await websocket.send(Actions.STOP)
                # fixme: we don't stop source here, so we have a delay, but if we do
                #  we cannot see the buffering in browser

                self.clients[websocket]['ready'] = True
                if (self.desired_state == Actions.PLAY) and (are_all_ready()):
                    await self.broadcast(Actions.PLAY, websocket)
            elif comand[0] == Actions.NOT_READY:
                await self.broadcast_except_sender(Actions.STOP, websocket)
                self.clients[websocket]['ready'] = False
            elif comand[0] == Actions.CHANGE_TIME:
                await self.broadcast_except_sender(message, websocket)

    # send message to everyone
    async def broadcast(self, message, websocket):
        room = self.clients[websocket]['room']
        print(f"broadcast{room}:\'{message}\'")
        if self.clients:
            await asyncio.wait(
                [client.send(message) for client, details in self.clients.items() if details['room'] == room])

    # send message to everyone else
    async def broadcast_except_sender(self, message, websocket):
        room = self.clients[websocket]['room']
        print(f"broadcast_except_sender:{room}:\'{message}\'")
        if self.clients:
            await asyncio.wait([client.send(message) for client, details in self.clients.items() if
                                client != websocket and details['room'] == room])

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


async def main():
    server = VideoSyncServer()
    if len(sys.argv) > 1 and sys.argv[1] == '--ssl':
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        certfile_path = pathlib.Path(__file__).with_name("server.crt")
        keyfile_path = pathlib.Path(__file__).with_name("server.key")
        ssl_context.load_cert_chain(certfile_path, keyfile_path)
        async with websockets.serve(server.video_sync, "", 443, ssl=ssl_context):
            await asyncio.Future()
    else:
        async with websockets.serve(server.video_sync, "", 3300):
            await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
