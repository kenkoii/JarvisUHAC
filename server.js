'use strict'

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const webhook = require('./routes/webhook');
const app = express();

app.set('port', (process.env.PORT || 1340))

// Process data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())


app.use('/webhook', webhook);
// ROUTES
app.get('/', (req, res) => {
  res.send("Howdy! I am a chatbot!");
});

app.listen(app.get('port'), () => {
  console.log("Running on port: ", app.get("port"));
});
