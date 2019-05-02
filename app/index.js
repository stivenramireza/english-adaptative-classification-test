const express = require('express');
const server = express();
const routes = require('./routes/routes');
const config = require('./config');
const mongoose = require('mongoose');
const path = require('path');

// Conexión a la base de datos
let dbConn = "mongodb+srv://sramir70:pass123@eafitclasscluster-bvmzy.mongodb.net/test?retryWrites=true"

mongoose.connect(dbConn, {useNewUrlParser: true}).then( () => {
  console.log(`Connected to ${dbConn} successfully...`);
}).catch( err => {
  console.log(`Error connecting to ${dbConn}, cause: ${err}`);
});

 // Middleware
const bodyParser = require('body-parser');

server.use(express.static(path.join(__dirname, 'views')));
server.use(bodyParser.urlencoded( { extended: false } ) );
server.use(bodyParser.json());

server.set('views', path.join(__dirname, 'views'));
server.set('view engine', 'ejs');

 // Attach routes as middleware
server.use(routes);

const PORT = 8000;
const HOST = '0.0.0.0'; // Listen from everywhere

server.listen(PORT, HOST, function(){
  console.log(`Listening to ${PORT} on ${HOST}.\n`);
});

server.get('/', (req, res) => {
  res.redirect('/signin');
});

module.exports = server;