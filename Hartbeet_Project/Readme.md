
Link To Server: http://ec2-3-129-73-12.us-east-2.compute.amazonaws.com:3000/

Example account
    Email: ethan@gmail.com
    Password: Arizona44

Youtube Links
    Pitch Video: https://youtu.be/U_UL0gCQ_ls 

Project Implementation Video 
    User Experience Video: https://youtu.be/QxVhIgtB1Fs
    Code Implementation Video (Particle & Server): https://youtu.be/2eUqXHQMtLU 
		
Endpoint Documentation

let userSchema = new db.Schema({
 email:          { type: String, required: true, unique: true },
 fullName:       { type: String, required: true },
 passwordHash:   String,
 dateRegistered: { type: Date, default: Date.now },
 lastAccess:     { type: Date, default: Date.now },
 userDevices:    [String],  //[{ deviceId: , apikey:  }, ]
 readings:       [String], //[{ heartBeat: , oxygenLevel: , time: , deviceId: , apikey } , ]
 frequency:      Number,
 startTime:      Number,
 endTime:        Number
});

userDevices and readings are stringified json objects that can be parsed to give the data,. we saw this as the only working option because the database did not like arrays of json data. Frequency, start and endtime are all user functions that apply to all devices. 

>/devices/register

When creating a device, the webpage will prompt the user for a Device ID and the Devices Authentication Token given by the particle website, then with those they can be put into the webhook and begin exchanging data with the particle device. 

using the Devices.findOne the device is proven to not already exist and creates the end device and saves it to the database. 

let newDevice = new Device({
       deviceId: req.body.deviceId,
       userEmail: email,
       apikey: deviceApikey,
       devAuthToken: req.body.devAuthToken
     });

>/devices/ping

Pinging the device will cause the device to use the most up to date frequency settings and hours active settings. Otherwise it will periodically search to see if the settings have changed by the server passively. Ping is to speed up the process instead of happening every cycle.

It utilizes a function called superagent that makes a post request with an authenication token to the URL provided. The URL calls a function on the Particle device.

>/devices/remove

Very functionally similar to adding a device with one major difference towards the end of the function.

Device.deleteOne({deviceId: req.body.deviceId}, function(err, obj) {
     if (err) throw err;
     console.log("1 document deleted");
   });

>/users/register

This endpoint is used when creating an account, all the error checking and password strength check is done on the front end so the data is in the correct format and has all the necessary fields. New user object looks like the following

let newUser = new User({
       email: req.body.email,
       fullName: req.body.fullName,
       passwordHash: hash,
       startTime: 6,
       endTime: 22,
       frequency: 30
     });

>/users/signin

Used for signing in to accounts and creating authentication tokens for quick logins. 

let authToken = jwt.encode({email: req.body.email}, secret);
         console.log("Sign in Successful. "+req.body.email);
         res.status(201).json({ success: true, authToken: authToken });

>/users/account

This is called when the account page is reached and sends back all the data about the currently logged in user. First it checks if the authentication token is valid and attached to an account

let authToken = req.headers["x-auth"];

Then we find the user in the database
let decodedToken = jwt.decode(authToken, secret);

   User.findOne({email: decodedToken.email}, function(err, user) 

A json file is prepared to send as a response to the request containing all the important information about the user. 

accountInfo["success"] = true;
       accountInfo["email"] = user.email;
       accountInfo["fullName"] = user.fullName;
       accountInfo["lastAccess"] = user.lastAccess;
       accountInfo["startTime"] = user.startTime;
       accountInfo["endTime"] = user.endTime;
       accountInfo["frequency"] = user.frequency;
       accountInfo['devices'] = [];   // Array of devices

       accountInfo["readings"] = user.readings;

All of the readings are organized as a string but the devices only contain an array of the names of the api keys so the code populates the devices array with all their information.

for (let device of devices){
             accountInfo['devices'].push({ deviceId: device.deviceId, apikey:device.apikey, devAuthToken: device.devAuthToken});
           }

>/users/incomingData 

In the JSON format like this
{ "deviceId": "device1", "apikey": "cssFxWxvkLVsmtt9lPkZCtgJ1eFRAiVr", "avgBPM": "150", "avgO2": "95" }

The Data is then decoded and formatted into and assigned to the proper user and saved in the Mongodb. 
{
    "heartBeat": "150",
    "oxygenLevel": "95",
    "time": 1605928051432,
    "deviceId": "device1",
    "apikey": "cssFxWxvkLVsmtt9lPkZCtgJ1eFRAiVr"
}
Each reading is stored like the json value but instead as an array of Strings that are then parsed on the client side for displaying all the raw data. 

For easy testing of the data display without collecting real data we used postman to pass data and can use the JSON format above with an existing api key. 

> users/updateDevice

This route is called from the device itself periodically whenever the device takes a measurement and looks for if the frequency or hours have changed and sends it the current frequency information to update to. 

var sendThisStringToDevice = { 
       startTime: user.startTime,
       endTime: user.endTime,
       frequency: user.frequency
     };

>users/edit

This is used when the user wants to update their password and name.

User.findOne({ email: req.body.email }, function(err, updateuser) {

       updateuser.fullName = req.body.fullName;
       updateuser.passwordHash = hash;

>users/frequency 

This is used for editing the frequency values on a users account.

updateuser.startTime = req.body.startTime;
       updateuser.endTime = req.body.endTime;
       updateuser.frequency = req.body.frequency;


