# BroccoFlix

BroccoFlix is a video synchronization tool that enables multiple clients to watch the same video in sync. Our application is built using Python for the server-side and JavaScript for the client-side.

## Overview

BroccoFlix allows users to synchronize their video playback across multiple devices, making it easy to watch movies and other videos together.

## Directory Structure

- `ext/`: Contains the browser extension code.
- `server/`: Contains the server-side code, including SSL key files (`fullchain.crt` and `privkey.key`).

## Features

- Synchronize video playback across multiple devices.

## Status

The main functionality is complete, but the application is still in progress and may be unstable.

## Getting Started

### Step 1: Add Extension to Browser in Debug Mode

### For example:
#### Chrome:

1. Go to `chrome://extensions/` in your Chrome browser.
2. Enable Developer mode by toggling the switch in the top-right corner.
3. Click "Load unpacked."
4. Select the `ext/` directory from your BroccoFlix repository.
5. The extension should now be loaded and visible in your browser.

#### Firefox:

1. Go to `about:debugging` in your Firefox browser.
2. Click "This Firefox" (in newer versions) or "Load Temporary Add-on" (in older versions).
3. Select the `ext/manifest.json` file from your BroccoFlix repository.
4. The extension should now be loaded and visible in your browser.

### Step 2: Run the Server

You can run the server locally or using Docker. Make sure the server has a static external IP address.

#### Local:

1. Run `python server/ServerLauncher.py` or `python server/ServerLauncher.py --ssl` to start the server.

#### Docker:

1. Build the Docker image by running `docker build -t broccoflix-server .` in the root directory of your BroccoFlix repository.
2. Run the Docker container by running `docker run -p 80:80 -p 443:443 broccoflix-server`.
