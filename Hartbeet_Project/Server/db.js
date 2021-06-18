const mongoose = require("mongoose");
//const mongo_uri = process.env.MONGO_URI;

// Use this on AWS ec2 with locally installed MongoDB
mongoose.connect("mongodb://localhost/mydb", { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

// On repl.it with Mogno Atlas DB
//mongoose.connect(mongo_uri, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

module.exports = mongoose;
