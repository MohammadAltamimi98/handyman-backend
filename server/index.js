// ---------- require dependencies ----------//
require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const PORT = process.env.PORT || 5000;
const cors = require('cors');
const user = require('./src/routes/user');
const ticketsRoute = require('./src/routes/ticket');
const server = http.createServer(app);
const io = require('socket.io')(http);
const adminsRoom = 'admins'; // this room have all the admins
const { v4: uuidv4 } = require('uuid');

app.use(express.json());
app.use(cors());
app.use(user);
app.use(ticketsRoute)
io.listen(server); // io listening to the server

const queue = {
  tickets: [],
  admins: []
};



app.get('/', (req, res) => {
  res.send('The backend of the Handyman application.')
}); // testing route 




io.on('connection', (socket) => {
  console.log('client is connected', socket.id);


  socket.on('join', (payload) => {
    console.log(payload);
    const admins = { name: payload.adminName, id: socket.id }

    queue.admins.push(admins);

    console.log(admins, "payload");
    socket.join(adminsRoom);
    socket.to(adminsRoom).emit('onlineAdmins', admins)

    console.log(queue.admins);
  });


  socket.on('createTicket', (payload) => {
    const ticketDetails = { ...payload, id: uuidv4(), socketId: socket.id };
    queue.tickets.push(ticketDetails);
    socket.in(adminsRoom).emit('newTicket', ticketDetails);
    console.log(payload);
  });

  // notify the client when the admin claims the ticket
  socket.on('claim', (payload) => {
    console.log(payload);
    socket.to(payload.clientId).emit('claimed', { name: payload.name });// which admin claimed your ticket
    queue.tickets = queue.tickets.filter((ticket) => ticket.id !== payload.id);
  });

  socket.on('getAll', () => {
    queue.admins.forEach((human) => {
      console.log(human);
      socket.emit('onlineAdmins', { name: human.name, id: human.id });
    });
    queue.tickets.forEach((tick) => {
      socket.emit('newTicket', tick)
    });
  })


  socket.on('disconnect', () => {
    socket.to(adminsRoom).emit('offlineAdmins', { id: socket.id });
    queue.admins = queue.admins.filter((s) => s.id !== socket.id);
  });
});



server.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
});
