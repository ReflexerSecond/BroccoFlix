import asyncio
import logging
import pathlib
import ssl
import sys

import websockets

from server.VideoSyncServer import VideoSyncServer

logging.basicConfig(level=logging.INFO)


def _create_ssl_context():
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


async def _start_server(server, use_ssl):
    """
    Starts the server with or without SSL, depending on the use_ssl parameter.
    Args:
        server (server.VideoSyncServer.VideoSyncServer): The server to start.
        use_ssl (bool): Whether to use SSL for the server.
    """
    ssl_context = _create_ssl_context() if use_ssl else None
    port = 443 if use_ssl else 3000
    async with websockets.serve(server.process_connection, "", port, ssl=ssl_context):
        await asyncio.Future()


async def launch(server):
    """
    Launches the server.
    The server is launched with SSL if the '--ssl' argument is present in the command line arguments.
    Args:
        server (server.VideoSyncServer.VideoSyncServer): The server to launch.
    """
    await _start_server(server, '--ssl' in sys.argv)


if __name__ == "__main__":
    asyncio.run(launch(VideoSyncServer()))
