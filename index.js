const express = require("express");
var session = require("express-session");
const app = express();
const path = require("path");

const port = process.env.PORT || 3003;
var moment = require("moment"); 
app.locals.moment = moment;

const principalRoute = require("./router/principalRoute");


app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: false }));


app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);


app.use("/", principalRoute);


app.listen(port, function () {
  console.log("Servidor funcionando na porta: " + port);
});