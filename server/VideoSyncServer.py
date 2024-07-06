import asyncio
import json
import logging
import traceback
from datetime import datetime

import websockets

from server.Constants import Client, Roles, Room, ClientActions, States


class VideoSyncServer:
    """
    This class contains the main logic of the server.
    """

    def __init__(self):
        self.clients = {}  # element = socket: {name, time, room, role}
        self.rooms = {}  # element = room: {[client], time}

    async def process_connection(self, websocket, path):
        """
        Processes all connection lifecycle.
        """
        await self._add_client(websocket, path)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except Exception as e:
            logging.info(f"Connection closed: {e}")
            if e.__class__ != websockets.ConnectionClosed:
                print(f"Error: {e}")
                print(f"Details: {traceback.format_exc()}")
        finally:
            await self._remove_client(websocket)
            logging.info(f"Connection closed. Clients remain: {len(self.clients)}")

    async def _add_client(self, websocket, path):
        """
        1. Creates a new client.
        2. Adds the client to the existing room or creates a new room.
        3. Sets the role of the client to MASTER if it is the first client in the room.
        """
        self.clients[websocket] = Client(websocket, str(websocket.remote_address), None, path, None)

        if self.rooms.get(path) and len(self.rooms[path].get_client_list()) > 0:
            self.rooms[path].add_client(websocket)
            self.clients[websocket].set_role(Roles.VIEWER)
        else:
            self.rooms[path] = Room(0)
            self.rooms[path].add_client(websocket)
            self.clients[websocket].set_role(Roles.MASTER)

        logging.info(f"Client {self.clients[websocket].get_name()} connected.")

    async def _remove_client(self, websocket):
        """
        1. Removes a client.
        2. Removes the client from the room.
        3. Changes the role of the next client in the room to MASTER if exists.
        """
        client_room = self.clients[websocket].get_room()
        self.rooms[client_room].remove_client(websocket)
        if self.clients[websocket].get_role() == Roles.MASTER:
            clients_in_room = self.rooms[client_room].get_client_list()
            if len(clients_in_room) > 0:
                self.clients[clients_in_room[0]].set_role(Roles.MASTER)

        self.clients.pop(websocket, None)
        logging.info(f"Client {websocket.remote_address} disconnected")

    async def handle_message(self, websocket, message):
        """
        Handles a message from a client.
        """
        logging.info(f"Message #{self.clients[websocket].get_name()}: \"{message}\"")
        parsed_message = json.loads(message)
        current_client = self.clients[websocket]

        client_action = parsed_message['action']
        if client_action:
            current_client.set_time(parsed_message['video_time'])
            response = {
                "name": current_client.get_name(),
                "role": current_client.get_role(),
                "video_time": current_client.get_time(),
                "server_time": datetime.now().isoformat(),
                "client_list": [self.clients[socket].get_name() for socket in
                                self.rooms[current_client.get_room()].get_client_list()]
            }

            actions = {
                ClientActions.PING: lambda: websocket.send(json.dumps(response)),
                ClientActions.STOP: lambda: self.broadcast(current_client, response, ClientActions.STOP, state=States.PAUSED, send_to_current_client=False),
                ClientActions.SYNC: lambda: self.broadcast(current_client, response, ClientActions.SYNC, send_to_current_client=False),
                ClientActions.LOAD: lambda: self.broadcast(current_client, response, ClientActions.LOAD, state=States.LOADING, send_to_current_client=False),
            }

            if client_action == ClientActions.PLAY:
                current_client.set_state(States.LOADED)
                if self.are_all_clients_ready(current_client):
                    await self.broadcast(current_client, response, ClientActions.PLAY, state=States.PLAYING, send_to_current_client=False)
            elif client_action in actions:
                await actions[client_action]()
            else:
                logging.info(f"Unknown action: {parsed_message['action']}")
                await websocket.send(json.dumps("{error: 'Unknown action'}"))

    async def broadcast(self, current_client, response, action, state=None, send_to_current_client=True):
        """
        Broadcasts a message to all clients in the same room as the current client.
        """

        if state:
            current_client.set_state(state)
        response["action"] = action
        response_dumped = json.dumps(response)
        current_client_room = current_client.get_room()
        logging.info(f"{response["name"]}, to everyone: {send_to_current_client}\nresponse: {response_dumped}")
        tasks = [client.send(response_dumped)
                 for client in self.rooms[current_client_room].get_client_list()
                 if send_to_current_client or client != current_client.get_websocket()]

        await asyncio.gather(*tasks)

    def are_all_clients_ready(self, current_client):
        """
        Checks if all clients in the same room as the current client are ready.
        """
        return all(self.clients[client].get_state() != States.LOADING
                   for client in self.rooms[current_client.get_room()].get_client_list())
