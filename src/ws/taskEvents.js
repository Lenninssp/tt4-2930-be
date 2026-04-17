const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const { jwtSecret } = require("../config/auth");

const taskConnections = new Map();

const createAcceptValue = (webSocketKey) =>
  crypto
    .createHash("sha1")
    .update(`${webSocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`, "binary")
    .digest("base64");

const createFrame = (payload) => {
  const payloadBuffer = Buffer.from(payload);
  const payloadLength = payloadBuffer.length;

  if (payloadLength < 126) {
    return Buffer.concat([
      Buffer.from([0x81, payloadLength]),
      payloadBuffer
    ]);
  }

  if (payloadLength < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payloadLength, 2);
    return Buffer.concat([header, payloadBuffer]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payloadLength), 2);
  return Buffer.concat([header, payloadBuffer]);
};

const registerConnection = (userId, socket) => {
  const connections = taskConnections.get(userId) || new Set();
  connections.add(socket);
  taskConnections.set(userId, connections);
};

const unregisterConnection = (userId, socket) => {
  const connections = taskConnections.get(userId);
  if (!connections) {
    return;
  }

  connections.delete(socket);
  if (connections.size === 0) {
    taskConnections.delete(userId);
  }
};

const sendSocketMessage = (socket, message) => {
  if (socket.destroyed || !socket.writable) {
    return;
  }

  socket.write(createFrame(JSON.stringify(message)));
};

const broadcastTaskEvent = ({ type, recipients, task, taskId }) => {
  const message = {
    type,
    data: {}
  };

  if (task) {
    message.data.task = task;
  }

  if (taskId) {
    message.data.taskId = taskId;
  }

  for (const userId of recipients) {
    const connections = taskConnections.get(String(userId));
    if (!connections) {
      continue;
    }

    for (const socket of connections) {
      sendSocketMessage(socket, message);
    }
  }
};

const getWebSocketToken = (request) => {
  const requestUrl = new URL(request.url, "http://localhost");
  return requestUrl.searchParams.get("token");
};

const attachTaskEventServer = (server) => {
  server.on("upgrade", (request, socket) => {
    if (!request.url || !request.url.startsWith("/ws/tasks")) {
      socket.destroy();
      return;
    }

    const token = getWebSocketToken(request);
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, jwtSecret);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const webSocketKey = request.headers["sec-websocket-key"];
    if (!webSocketKey) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const acceptValue = createAcceptValue(webSocketKey);
    socket.write(
      [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${acceptValue}`,
        "\r\n"
      ].join("\r\n")
    );

    const userId = String(decodedToken.id);
    registerConnection(userId, socket);

    const cleanup = () => unregisterConnection(userId, socket);

    socket.on("close", cleanup);
    socket.on("end", cleanup);
    socket.on("error", cleanup);
  });
};

module.exports = { attachTaskEventServer, broadcastTaskEvent };
