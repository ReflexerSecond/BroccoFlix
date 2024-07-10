class ClientActions:
    """
    This class defines the possible actions a client can take.
    """
    PING = 'PING'  # Used to get the name, role and delay
    PLAY = 'PLAY'  # Client is trying to start the video. It will only start if everyone is ready
    STOP = 'STOP'  # Client has stopped the video
    SYNC = 'SYNC'  # Client has clicked on the timeline
    LOAD = 'LOAD'  # Client is buffering
    LOADED = 'LOADED'  # Client is ready


class States:
    """
    This class defines the possible states a client can be in.
    """
    PLAYING = 'playing'
    PAUSED = 'paused'
    LOADING = 'loading'  # Client is buffering
    LOADED = 'loaded'  # Client is ready and wants to play, but waiting for others


class Roles:
    """
    This class defines the possible roles a client can have.
    """
    MASTER = 0  # The client that controls room settings
    VIEWER = 1  # Regular client


class Client:
    """
    This class represents a client connected to the server.
    """

    def __init__(self, _websocket, _name, _time, _room, _role):
        self._websocket = _websocket
        self._name = _name
        self._time = _time
        self._room = _room
        self._role = _role
        self._state = States.PAUSED

    def get_websocket(self):
        return self._websocket

    def set_websocket(self, _websocket):
        self._websocket = _websocket

    def get_name(self):
        return self._name

    def set_name(self, _name):
        self._name = _name

    def get_time(self):
        return self._time

    def set_time(self, _time):
        self._time = _time

    def get_room(self):
        return self._room

    def set_room(self, _room):
        self._room = _room

    def get_role(self):
        return self._role

    def set_role(self, _role):
        self._role = _role

    def get_state(self):
        return self._state

    def set_state(self, _state):
        self._state = _state


class Room:
    """
    This class represents a room in the server.
    """

    def __init__(self, time):
        self._client_list = []
        self._time = time
        self._state = States.PAUSED

    def get_client_list(self):
        return self._client_list

    def add_client(self, client):
        self._client_list.append(client)

    def remove_client(self, client):
        self._client_list.remove(client)

    def get_time(self):
        return self._time

    def get_state(self):
        return self._state

    def set_state(self, state):
        self._state = state