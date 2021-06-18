let db = require("../db");

let deviceSchema = new db.Schema({
    apikey:       String,
    devAuthToken: String,
    deviceId:     String,
    userEmail:    String,
    lastContact:  { type: Date, default: Date.now }
});

var Device = db.model("Device", deviceSchema);

module.exports = Device;
