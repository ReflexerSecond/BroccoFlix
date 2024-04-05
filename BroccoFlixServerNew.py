import asyncio
import json
import logging
import pathlib
import ssl
import sys
import traceback
from datetime import datetime

import websockets

logging.basicConfig(level=logging.INFO)


# Constants
class ClientActions:
    """
    This class defines the possible actions a client can take.
    """
    PING = 'ping'  # Used to get the name, role and delay
    PLAY = 'play'  # Client is trying to start the video. It will only start if everyone is ready
    STOP = 'pause'  # Client has stopped the video
    SYNC = 'sync'  # Client has clicked on the timeline
    LOAD = 'load'  # Client is buffering
    GET_CLIENTS = 'get_clients'  # Client has requested the list of clients


class States:
    """
    This class defines the possible states a client can be in.
    """
    PLAYING = 'playing'
    PAUSED = 'paused'
    LOADING = 'loading'
    LOADED = 'loaded'


class Roles:
    """
    This class defines the possible roles a client can have.
    """
    MASTER = 'master'
    VIEWER = 'viewer'


class VideoSyncServer:
    """
    This class represents a server for synchronizing video playback across multiple clients.
    """

    def __init__(self):
        """
        Initializes a new instance of the VideoSyncServer class.
        """
        self.clients = {}  # element = socket: {name, time, room, role}
        self.rooms = {}  # element = room: {[client], time}

    async def process_connection(self, websocket, path):
        """
        Processes a new connection from a client.

        Args:
            websocket: The websocket connection from the client.
            path: The path of the request from the client.
        """
        await self._add_client(websocket, path)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except Exception as e:
            logging.info(f"Connection closed: {e}")
            if not (e.__class__ == websockets.ConnectionClosed):
                print(f"Error: {e}")
                print(f"Details: {traceback.format_exc()}")
        finally:
            await self._remove_client(websocket)
            logging.info(f"Connection closed. Clients remain: {len(self.clients)}")

    async def _add_client(self, websocket, path):
        """
        Adds a new client to the server.

        Args:
            websocket: The websocket connection from the client.
            path: The path of the request from the client.
        """
        self.clients[websocket] = {
            'name': str(websocket.remote_address),
            'time': None,
            'room': path,
            'role': None}

        if len(self.rooms.get(path, {}).get('client_list', [])) == 0:
            self.rooms[path] = {'client_list': [websocket], 'time': 0}
            self.clients[websocket]['role'] = Roles.MASTER
        else:
            self.rooms[path]['client_list'].append(websocket)
            self.clients[websocket]['role'] = Roles.VIEWER
        logging.info(f"Client {self.clients[websocket]['name']} connected.")

    async def _remove_client(self, websocket):
        """
        Removes a client from the server.

        Args:
            websocket: The websocket connection from the client.
        """
        client_room = self.clients[websocket]['room']
        self.rooms[client_room]['client_list'].remove(websocket)
        if self.clients[websocket]['role'] == Roles.MASTER:
            clients_in_room = self.rooms[client_room]['client_list']
            if len(clients_in_room) > 0:
                self.clients[clients_in_room[0]]['role'] = Roles.MASTER
        self.clients.pop(websocket, None)
        logging.info(f"Client {websocket.remote_address} disconnected")

    async def handle_message(self, websocket, message):
        """
        Handles a message from a client.

        Args:
            websocket: The websocket connection from the client.
            message: The message from the client.
        """
        logging.info(f"Message #{self.clients[websocket]['name']}: \"{message}\"")
        parsed_message = json.loads(message)
        logging.info(f"Parsed message: {parsed_message}")
        current_client = self.clients[websocket]

        current_client['time'] = parsed_message['video_time']
        response = {
            "name": current_client['name'],
            "role": current_client['role'],
            "client_list": [self.clients[socket]['name'] for socket in self.rooms[current_client['room']]['client_list']]
        }

        actions_map = {
            ClientActions.PING: self.ping_action,
            ClientActions.PLAY: self.play_action,
            ClientActions.STOP: self.stop_action,
            ClientActions.SYNC: self.sync_action,
            ClientActions.LOAD: self.load_action,
        }
        if parsed_message['action'] in actions_map:
            await actions_map[parsed_message['action']](websocket, response)

    async def ping_action(self, websocket, response):
        """
        Handles a ping action from a client.

        Args:
            websocket: The websocket connection from the client.
            response: The response to the client.
        """
        response["action"] = "pong"
        response["value"] = ClientActions.PLAY
        response["server_time"] = datetime.now().isoformat()
        logging.info(f"Sending pong to {self.clients[websocket]['name']}: {response['server_time']}")
        await websocket.send(json.dumps(response))

    async def play_action(self, websocket, response):
        """
        Handles a play action from a client.

        Args:
            websocket: The websocket connection from the client.
            response: The response to the client.
        """
        current_client = self.clients[websocket]
        current_client['state'] = States.LOADED
        if self.check_all_clients_are_ready(current_client):
            response["action"] = "change_state"
            response["value"] = ClientActions.PLAY
            response["server_time"] = datetime.now().isoformat()
            await self.broadcast(current_client, response)

    async def stop_action(self, websocket, response):
        """
        Handles a stop action from a client.

        Args:
            websocket: The websocket connection from the client.
            response: The response to the client.
        """
        current_client = self.clients[websocket]
        current_client['state'] = States.PAUSED
        response["action"] = "change_state"
        response["value"] = ClientActions.STOP
        response["server_time"] = datetime.now().isoformat()
        await self.broadcast(current_client, response)

    async def sync_action(self, websocket, response):
        """
        Handles a sync action from a client.

        Args:
            websocket: The websocket connection from the client.
            response: The response to the client.
        """
        current_client = self.clients[websocket]
        response["action"] = "change_time"
        response["value"] = current_client['name']
        response["server_time"] = datetime.now().isoformat()
        await self.broadcast(current_client, response)

    async def load_action(self, websocket, response):
        """
        Handles a load action from a client.

        Args:
            websocket: The websocket connection from the client.
            response: The response to the client.
        """
        current_client = self.clients[websocket]
        current_client['state'] = States.LOADING
        response["action"] = "load"
        response["value"] = current_client['name']
        response["server_time"] = datetime.now().isoformat()
        await self.broadcast(current_client, response)

    async def broadcast(self, current_client, response):
        """
        Broadcasts a message to all clients in the same room as the current client.

        Args:
            current_client: The current client.
            response: The response to the clients.
        """
        tasks = [client.send(json.dumps(response)) for client in self.rooms[current_client['room']]['client_list']]
        await asyncio.gather(*tasks)

    def check_all_clients_are_ready(self, current_client):
        """
        Checks if all clients in the same room as the current client are ready.

        Args:
            current_client: The current client.

        Returns:
            bool: True if all clients are ready, False otherwise.
        """
        return all(self.clients[client]['state'] != States.LOADING
                   for client in self.rooms[current_client['room']]['client_list'])

class ServerLauncher:
    """
    This class is responsible for launching the server with or without SSL.
    """

    def _create_ssl_context(self):
        """
        Creates an SSL context for secure connections.
        The SSL context is created using the certificate and private key files located in the same directory as this script.
        Returns:
            ssl.SSLContext: The created SSL context.
        """
        base_path = pathlib.Path(__file__)
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(base_path.with_name("fullchain.crt"), base_path.with_name("privkey.key"))
        return ssl_context

    async def _start_server(self, server, use_ssl):
        """
        Starts the server with or without SSL, depending on the use_ssl parameter.
        Args:
            server (VideoSyncServer): The server to start.
            use_ssl (bool): Whether to use SSL for the server.
        """
        ssl_context = self._create_ssl_context() if use_ssl else None
        port = 443 if use_ssl else 3000
        async with websockets.serve(server.process_connection, "", port, ssl=ssl_context):
            await asyncio.Future()

    async def launch(self, server):
        """
        Launches the server.
        The server is launched with SSL if the '--ssl' argument is present in the command line arguments.
        Args:
            server (VideoSyncServer): The server to launch.
        """
        await self._start_server(server, '--ssl' in sys.argv)


if __name__ == "__main__":
    launcher = ServerLauncher()
    asyncio.run(launcher.launch(VideoSyncServer()))
