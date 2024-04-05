import unittest
from unittest.mock import AsyncMock
import json

from BroccoFlixServerNew import VideoSyncServer, ClientActions, Roles, States


class TestVideoSyncServer(unittest.IsolatedAsyncioTestCase):
    """
    This class contains unit tests for the VideoSyncServer class.
    """

    def setUp(self):
        """
        This method sets up the test environment before each test method is run.
        It creates a new instance of VideoSyncServer and a mock websocket.
        """
        self.server = VideoSyncServer()
        self.mock_websocket = AsyncMock()
        self.mock_websocket.remote_address = '127.0.0.1'

    async def test_client_lifecycle(self):
        """
        This method tests the lifecycle of a client, from addition to removal.
        It first adds a client to the server and checks if it is added correctly.
        Then it removes the client and checks if it is removed correctly.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        self.assertIn(self.mock_websocket, self.server.clients)
        self.assertEqual(self.server.clients[self.mock_websocket]['role'], Roles.MASTER)

        await self.server._remove_client(self.mock_websocket)
        self.assertNotIn(self.mock_websocket, self.server.clients)

    async def test_handle_messages(self):
        """
        This method tests the handling of different client actions.
        It adds a client to the server and sends different actions to the server.
        It then checks if the server handles these actions correctly.
        """
        await self.server._add_client(self.mock_websocket, '/test')

        for action, state in [(ClientActions.PING, None),
                              (ClientActions.PLAY, States.LOADED),
                              (ClientActions.STOP, States.PAUSED),
                              (ClientActions.SYNC, None),
                              (ClientActions.LOAD, States.LOADING)]:
            message = json.dumps({'action': action, 'video_time': 0})
            await self.server.handle_message(self.mock_websocket, message)
            if state:
                self.assertEqual(self.server.clients[self.mock_websocket]['state'], state)
            else:
                self.mock_websocket.send.assert_called()

    async def test_check_all_clients_are_ready(self):
        """
        This method tests the check_all_clients_are_ready method of the server.
        It adds a client to the server, sets its state to LOADED, and checks if the server correctly identifies that all clients are ready.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        self.server.clients[self.mock_websocket]['state'] = States.LOADED
        self.assertTrue(self.server.check_all_clients_are_ready(self.server.clients[self.mock_websocket]))

    async def test_ping_action(self):
        """
        This method tests the ping_action method of the server.
        It simulates a client sending a PING action and checks the server's response.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        response = {"name": self.server.clients[self.mock_websocket]['name'], "role": self.server.clients[self.mock_websocket]['role']}
        await self.server.ping_action(self.mock_websocket, response)
        self.mock_websocket.send.assert_called()

    async def test_play_action(self):
        """
        This method tests the play_action method of the server.
        It simulates a client sending a PLAY action and checks the server's response.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        response = {"name": self.server.clients[self.mock_websocket]['name'], "role": self.server.clients[self.mock_websocket]['role']}
        await self.server.play_action(self.mock_websocket, response)
        self.mock_websocket.send.assert_called()

    async def test_stop_action(self):
        """
        This method tests the stop_action method of the server.
        It simulates a client sending a STOP action and checks the server's response.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        response = {"name": self.server.clients[self.mock_websocket]['name'], "role": self.server.clients[self.mock_websocket]['role']}
        await self.server.stop_action(self.mock_websocket, response)
        self.mock_websocket.send.assert_called()

    async def test_sync_action(self):
        """
        This method tests the sync_action method of the server.
        It simulates a client sending a SYNC action and checks the server's response.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        response = {"name": self.server.clients[self.mock_websocket]['name'], "role": self.server.clients[self.mock_websocket]['role']}
        await self.server.sync_action(self.mock_websocket, response)
        self.mock_websocket.send.assert_called()

    async def test_load_action(self):
        """
        This method tests the load_action method of the server.
        It simulates a client sending a LOAD action and checks the server's response.
        """
        await self.server._add_client(self.mock_websocket, '/test')
        response = {"name": self.server.clients[self.mock_websocket]['name'], "role": self.server.clients[self.mock_websocket]['role']}
        await self.server.load_action(self.mock_websocket, response)
        self.mock_websocket.send.assert_called()

    async def test_client_roles(self):
        """
        This method tests the roles assigned to the clients.
        It adds two clients to the server and checks their roles.
        """
        # Add first client
        await self.server._add_client(self.mock_websocket, '/test')
        self.assertEqual(self.server.clients[self.mock_websocket]['role'], Roles.MASTER)

        # Add second client
        mock_websocket_2 = AsyncMock()
        mock_websocket_2.remote_address = '127.0.0.2'
        await self.server._add_client(mock_websocket_2, '/test')
        self.assertEqual(self.server.clients[mock_websocket_2]['role'], Roles.VIEWER)

        # Remove first client (master)
        await self.server._remove_client(self.mock_websocket)
        self.assertEqual(self.server.clients[mock_websocket_2]['role'], Roles.MASTER)

        # Remove second client (master)
        await self.server._remove_client(mock_websocket_2)

        # Add client again
        await self.server._add_client(self.mock_websocket, '/test')
        self.assertEqual(self.server.clients[self.mock_websocket]['role'], Roles.MASTER)


if __name__ == '__main__':
    unittest.main()
