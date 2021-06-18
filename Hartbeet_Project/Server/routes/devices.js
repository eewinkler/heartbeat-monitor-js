const express = require('express');
let router = express.Router();
let jwt = require("jwt-simple");
let fs = require('fs');
let Device = require("../models/device");
let superagent = require('superagent');
// On Repl.it, add JWT_SECRET to the .env file, and use this code
let secret = fs.readFileSync(__dirname + '/../../jwtkey.txt').toString();

function getNewApikey() {
  let newApikey = "";
  let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  for (let i = 0; i < 32; i++) {
    newApikey += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return newApikey;
}

router.post('/register', function(req, res, next) {
  let responseJson = {
    registered: false,
    message : "",
    apikey : "none",
    deviceId : "none",
    devAuthToken: "none"
  };
  let deviceExists = false;
  
  // Ensure the request includes the deviceId parameter
  if( !req.body.hasOwnProperty("deviceId")) {
    responseJson.message = "Missing deviceId.";
    console.log(responseJson.message);
    return res.status(400).json(responseJson);
  }

  let email = "";
    
  // If authToken provided, use email in authToken 
  if (req.headers["x-auth"]) {
    try {
      let decodedToken = jwt.decode(req.headers["x-auth"], secret);
      email = decodedToken.email;
    }
    catch (ex) {
      responseJson.message = "Invalid authorization token.";
      console.log(responseJson.message);
      return res.status(401).json(responseJson);
    }
  }
  else {
    // Ensure the request includes the email parameter
    if( !req.body.hasOwnProperty("email")) {
      responseJson.message = "Invalid authorization token or missing email address.";
      console.log(responseJson.message);
      return res.status(401).json(responseJson);
    }
    email = req.body.email;
  }
    
  // See if device is already registered
  Device.findOne({ deviceId: req.body.deviceId }, function(err, device) {
    if (device !== null) {
      responseJson.message = "Device ID " + req.body.deviceId + " already registered.";
      console.log(responseJson.message);
      return res.status(400).json(responseJson);
    }
    else {
      // Get a new apikey
	   deviceApikey = getNewApikey();
	    
	    // Create a new device with specified id, user email, and randomly generated apikey.
      let newDevice = new Device({
        deviceId: req.body.deviceId,
        userEmail: email,
        apikey: deviceApikey,
        devAuthToken: req.body.devAuthToken
      });

      // Save device. If successful, return success. If not, return error message.
      newDevice.save(function(err, newDevice) {
        if (err) {
          responseJson.message = err;
          console.log(responseJson.message);
          // This following is equivalent to: res.status(400).send(JSON.stringify(responseJson));
          return res.status(400).json(responseJson);
        }
        else {
          responseJson.registered = true;
          responseJson.apikey = deviceApikey;
          responseJson.deviceId = req.body.deviceId;
          responseJson.devAuthToken = req.body.devAuthToken;
          responseJson.message = "Device ID " + req.body.deviceId + " was registered.";
          console.log(responseJson.message);
          return res.status(201).json(responseJson);
        }
      });
    }
  });
});

router.post('/ping', function(req, res, next) {
    let responseJson = {
        success: false,
        message : "",
    };
    let deviceExists = false;

    var authkeyyyyyyyyyy = "mom";
    
    //Ensure the request includes the deviceId parameter
    if( !req.body.hasOwnProperty("deviceId")) {
        responseJson.message = "Missing deviceId.";
        console.log(responseJson.message);
        return res.status(400).json(responseJson);
    }
    
   
    Device.findOne({ deviceId: req.body.deviceId }, function(err, device) {
      if (device === null) {//device not found
        responseJson.message = "Device ID " + req.body.deviceId + " not registered.";
        console.log(responseJson.message);
        return res.status(400).json(responseJson);
      }
      else {
        authkeyyyyyyyyyy = device.devAuthToken;
		
		superagent
        .post("https://api.particle.io/v1/devices/" + req.body.deviceId + "/callThisUpdate")
        .type('application/x-www-form-urlencoded')
        .send({ signal: 1, access_token : authkeyyyyyyyyyy}) 
		.end((err, response) => {
			if (err) {
				responseJson.message = err;
				console.log(responseJson.message);
			}
          responseJson.success = true;
          responseJson.message = "Device ID " + req.body.deviceId + " updated.";
          return res.status(200).json(responseJson);
        });    
		
		
      }
    });

});
router.post('/remove', function(req, res, next) { //removed a device from a user
    let responseJson = {
      success: false,
      message : "",
    };
    let deviceExists = false;
    
    // Ensure the request includes the deviceId parameter
    if( !req.body.hasOwnProperty("deviceId")) {
      responseJson.message = "Missing deviceId.";
      console.log(responseJson.message);
      return res.status(400).json(responseJson);
    }
    
    // If authToken provided, use email in authToken 
    try {
      let decodedToken = jwt.decode(req.headers["x-auth"], secret);
    }
    catch (ex) {
      responseJson.message = "Invalid authorization token.";
      console.log(responseJson.message);
      return res.status(400).json(responseJson);
    }
    
    //just remove the device from the database
    Device.deleteOne({deviceId: req.body.deviceId}, function(err, obj) {
      if (err) throw err;
      console.log("1 document deleted");
    });
         
    responseJson.success = true;
    responseJson.message = "Device ID " + req.body.deviceId + " removed.";
    console.log(responseJson.message);
    return res.status(200).json(responseJson);
});

module.exports = router;
