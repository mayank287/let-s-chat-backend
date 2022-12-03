const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cloudinary = require("cloudinary");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");


dotenv.config();
connectDB();
const app = express();



// -----------------------------------  Use Some Important Functions  --------------------------------//
app.use(express.json()); // to accept json data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());

//  ----------------------------------------Routes -------------------------------------------------//
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/Message", messageRoutes);


// -------------------------------------- Cloudinary config --------------------------------------------------//
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// --------------------------deployment------------------------------ ---------- //

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}



// ---------------------------------- Error Handling middlewares ----------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`.yellow.bold)
);

// ----------------------------- Socket.io ---------------------
const io = require("socket.io")(server, {
  pingTimeout: 50000,
  cors: {
    origin:  "https://lets-chat-app-mayank.netlify.app",
   
  },
});


io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(userData._id)
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => 
  socket.in(room).emit("typing"));


  socket.on("stop typing", (room) =>
   socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return
     console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id ==
         newMessageRecieved.sender._id) return;

      socket.in(user._id)
      .emit("message recieved", 
      newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
