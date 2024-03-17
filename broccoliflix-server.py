import asyncio
import websockets
import logging
import ssl
import pathlib

logging.basicConfig(level=logging.INFO)

class actions:
    PLAY = 'play'
    STOP = 'pause'
    READY = 'ready'
    NOT_READY = 'notready'
    CHANGE_TIME = 'changetime'

class VideoSyncServer:
    def __init__(self):
        self.clients = {}
        self.desired_state = actions.PLAY

    #add client    
    async def register(self, websocket, path):
        room = 'default' if len(path) == 0 else path
        self.clients[websocket] = {'ready': True, 'name': websocket.remote_address, 'room': room}
        logging.info(f"Client {self.clients[websocket]['name']} connected to room {room}")
    
    #remove client
    async def unregister(self, websocket):
        self.clients.pop(websocket, None)
        logging.info(f"Client {websocket.remote_address} disconnected")

    #process message
    async def handle_message(self, websocket, message):
        async for message in websocket:
            print(f"Message #{self.clients[websocket]['name']}: \"{message}\"")
            comand = message.split(':')
            areAllReady = lambda : all(client['ready'] for client in self.clients.values() if client['room'] == self.clients[websocket]['room'])

            if comand[0] == actions.PLAY:
                self.desired_state = actions.PLAY
                await self.broadcast(actions.STOP, websocket)
                if (areAllReady()):
                    await self.broadcast(actions.PLAY, websocket)
            elif comand[0] == actions.STOP:
                self.desired_state = actions.STOP
                await self.broadcast_except_sender(actions.STOP, websocket)
            elif comand[0] == actions.READY:
                #fixme: we don't stop source here, so we have a delay, but if we do
                #we cannot see the buffering in browser
                self.clients[websocket]['ready'] = True
                if (self.desired_state == actions.PLAY) and (areAllReady()):
                    await self.broadcast(actions.PLAY, websocket)
            elif comand[0] == actions.NOT_READY:
                await self.broadcast_except_sender(actions.STOP, websocket)
                self.clients[websocket]['ready'] = False
            elif comand[0] == actions.CHANGE_TIME:
                await self.broadcast_except_sender(message, websocket)

    #send message to everyone
    async def broadcast(self, message, websocket):
        room = self.clients[websocket]['room']
        print(f"broadcast{room}:\'{message}\'")
        if self.clients:
            await asyncio.wait([client.send(message) for client, details in self.clients.items() if details['room'] == room])

    #send message to everyone else
    async def broadcast_except_sender(self, message, websocket):
        room = self.clients[websocket]['room']
        print(f"broadcast_except_sender:{room}:\'{message}\'")
        if self.clients:
            await asyncio.wait([client.send(message) for client, details in self.clients.items() if client != websocket and details['room'] == room])

    #processing for all messages
    async def video_sync(self, websocket, path):
        await self.register(websocket, path)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed as e:
            logging.info("Connection closed. Clients remain" + len(self.clients))
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
        finally:
            await self.unregister(websocket)

async def main():
    server = VideoSyncServer()
    #ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    #certfile_path = pathlib.Path(__file__).with_name("server.crt")
    #keyfile_path = pathlib.Path(__file__).with_name("server.key")
    #ssl_context.load_cert_chain(certfile_path, keyfile_path)
    #async with websockets.serve(server.video_sync, "", 443, ssl=ssl_context):
    async with websockets.serve(server.video_sync, "", 3300):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
