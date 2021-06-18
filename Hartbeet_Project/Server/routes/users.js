const express = require('express');
let router = express.Router();
let bcrypt = require("bcryptjs");
let jwt = require("jwt-simple");
let fs = require('fs');
let User = require('../models/users');
let Device = require('../models/device');

// FIXME: This is really bad practice to put an encryption key in code.
//let secret = "notasecretkeyyet";

// On Repl.it, add JWT_SECRET to the .env file, and use this code
let secret = fs.readFileSync(__dirname + '/../../jwtkey.txt').toString();

// On AWS ec2, you can use to store the secret in a separate file. 
// The file should be stored outside of your code directory. 
// let secret = fs.readFileSync(__dirname + '/../../jwtkey').toString();



// Register a new user
router.post('/register', function(req, res) {
  bcrypt.hash(req.body.password, 10, function(err, hash) {
    if (err) {
      res.status(400).json({success : false, message : err.errmsg});  
    }
    else {
      let newUser = new User({
        email: req.body.email,
        fullName: req.body.fullName,
        passwordHash: hash,
        startTime: 6,
        endTime: 22,
        frequency: 30
      });

      newUser.save(function(err, user) {
        if (err) {
          res.status(400).json({success: false, message: err.errmsg});
        }
        else {
          console.log(user.fullName + " has been created.");
          res.status(201).json({success: true, message: user.fullName + " has been created."});
        }
      });
    }
  });    
});

// Authenticate a user
router.post('/signin', function(req, res) {
  User.findOne({email: req.body.email}, function(err, user) {
    if (err) {
      res.status(401).json({ success: false, message: "Can't connect to DB." });
    }
    else if (!user) {
      res.status(401).json({ success: false, message: "Email or password invalid." });
    }
    else {
      bcrypt.compare(req.body.password, user.passwordHash, function(err, valid) {
        if (err) {
          res.status(401).json({ success: false, message: "Error authenticating. Contact support." });
        }
        else if(valid) {
          let authToken = jwt.encode({email: req.body.email}, secret);
          console.log("Sign in Sucsessful. "+req.body.email);
          res.status(201).json({ success: true, authToken: authToken });
        }
        else {
          res.status(401).json({ success: false, message: "Email or password invalid." });
        }
      });
    }
  });
});

// Return account information
router.get('/account', function(req, res) {
  if (!req.headers["x-auth"]) {
    res.status(401).json({ success: false, message: "No authentication token."});
    return;
  }

  let authToken = req.headers["x-auth"];
  let accountInfo = { };

  try {
    // Toaken decoded
    let decodedToken = jwt.decode(authToken, secret);

    User.findOne({email: decodedToken.email}, function(err, user) {
      if (err) {
        res.status(400).json({ success: false, message: "Error contacting DB. Please contact support."});
      }
      else {
        accountInfo["success"] = true;
        accountInfo["email"] = user.email;
        accountInfo["fullName"] = user.fullName;
        accountInfo["lastAccess"] = user.lastAccess;
        accountInfo["startTime"] = user.startTime;
        accountInfo["endTime"] = user.endTime;
        accountInfo["frequency"] = user.frequency;
        accountInfo['devices'] = [];   // Array of devices

        accountInfo["readings"] = user.readings;
         
         // TODO: Get devices registered by uses from devices collection
         // Add each device to the accountInfo['devices'] array
         
        Device.find({userEmail: user.email}, function(err, devices){ 
          if (err) {
            res.status(400).json({ success: false, message: "Error contacting DB. Please contact support."});
          }
          else{
            for (let device of devices){
              accountInfo['devices'].push({ deviceId: device.deviceId, apikey:device.apikey, devAuthToken: device.devAuthToken});
            }
            res.status(200).json(accountInfo);
          }
        });
      }//end else statement
    });
  }//end try 
  catch (ex) { // Token was invalid
    res.status(401).json({ success: false, message: "Invalid authentication token."});
  }
});

router.post('/incomingData', function(req, res) {
  console.log(req.body.deviceId);
  console.log(req.body.apikey);
  console.log(req.body.avgBPM);
  console.log(req.body.avgO2);
  console.log(req.body.time);
  
  let newReading = { 
    heartBeat: req.body.avgBPM, 
    oxygenLevel: req.body.avgO2, 
    time: req.body.time, //time format UNIX
    deviceId: req.body.deviceId, 
    apikey: req.body.apikey 
  }; 

  //put it into string format for saving
  readingformat = JSON.stringify(newReading);
  console.log(readingformat);

  Device.findOne({ apikey: req.body.apikey }, function(err, device) {
    if (device == null) {
      let responseJson = {errorMsg: "Device not registered with user"};
      console.log(responseJson.errorMsg);
      return res.status(400).json(responseJson.errorMsg);
    }
    else {
      User.findOne({ email: device.userEmail }, function(err, user) { //prob inplement api checking too afterwards
		  //{ $push: { readings: newReading}});
      user.readings.push(readingformat); //passes the stringed value into the thing
      
      user.save(function (err) { if( err) console.log('error updating'); }); 
  
      console.log("DATAROUTER: " + user.readings[0]);  
      });
      res.status(200).json(newReading);
    }

  });
});


router.post('/updateDevice', function(req, res) {
  console.log(req.body.deviceId);
  console.log(req.body.apikey);

  var sendThisStringToDevice = '';

  Device.findOne({ apikey: req.body.apikey }, function(err, device) {
    if (device == null) {
      let responseJson = {errorMsg: "Device not registered with user"};
      console.log(responseJson.errorMsg);
      return res.status(400).json(responseJson.errorMsg);
    }
    else {
      User.findOne({ email: device.userEmail }, function(err, user) {		  
        var sendThisStringToDevice = {  
        startTime: user.startTime,
        endTime: user.endTime,
        frequency: user.frequency
      };
      res.status(200).json(sendThisStringToDevice);
      });
    }

  });
});

router.post('/edit', function(req, res) {
  bcrypt.hash(req.body.password, 10, function(err, hash) {
    if (err) {
      res.status(400).json({success : false, message : err.errmsg});  
    }
    else { //lets edit a user!
      User.findOne({ email: req.body.email }, function(err, updateuser) {

        updateuser.fullName = req.body.fullName;
        updateuser.passwordHash = hash;

        updateuser.save(function(err, user) {
          if (err) {
            res.status(400).json({success: false, message: err.errmsg});
          }
          else {
            console.log(user.fullName + " has been edited.");
            res.status(201).json({success: true, message: user.fullName + " has been edited."});
          }
        });

      }); //end findone
    }
  });    
});

router.post('/frequency', function(req, res) {
    //else { //lets edit a user!
      User.findOne({ email: req.body.email }, function(err, updateuser) {

        updateuser.startTime = req.body.startTime;
        updateuser.endTime = req.body.endTime;
        updateuser.frequency = req.body.frequency;

        updateuser.save(function(err, user) {
          if (err) {
            res.status(400).json({success: false, message: err.errmsg});
          }
          else {
            console.log(user.frequency + " has been edited.");
            res.status(201).json({success: true, message: user.frequency + " has been edited."});
          }
        });

      }); //end findon
});

module.exports = router;
