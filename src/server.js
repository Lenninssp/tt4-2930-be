const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { connectDB } = require("./config/db");
const app = require("./app");
const { attachTaskEventServer } = require("./ws/taskEvents");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.use(
      "/frontend",
      express.static(path.join(__dirname, "../frontend/dist/frontend/browser")),
    );

    app.get("/frontend", (req, res) => {
      res.sendFile(
        path.join(__dirname, "../frontend/dist/frontend/browser/index.html"),
      );
    });


    const server = http.createServer(app);
    attachTaskEventServer(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
