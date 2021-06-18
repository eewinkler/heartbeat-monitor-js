function sendAccountRequest() {
  $.ajax({
    url: '/users/account',
    method: 'GET',
    headers: { 'x-auth' : window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
    .done(accountInfoSuccess)
    .fail(accountInfoError);
}

function accountInfoSuccess(data, textStatus, jqXHR) {

  console.log(data);
  var startTag = ":00am";
  var endTag = ":00am";
  var freqTag = " minutes";

  var startTimeDef = data.startTime;
  if (data.startTime == 0) {
    var startTimeDef = 12;
  }
  if (data.startTime == 12) {
    startTag = ":00pm";
  }
  if (data.startTime > 12) {
    var startTimeDef = data.startTime - 12;
    startTag = ":00pm";
  }
  var endTimeDef = data.endTime;
  if (data.endTime == 0) {
    var endTimeDef = 12;
  }
  if (data.endTime == 12) {
    endTag = ":00pm";
  }
  if (data.endTime > 12) {
    var endTimeDef = data.endTime - 12;
    endTag = ":00pm";
  }
  var frequencyDef = data.frequency;
  if (data.frequency > 45) {
    var frequencyDef = data.frequency/60;
    freqTag = " hours";
  }

  $('#email').html(data.email);
  $('#fullName').html(data.fullName);
  $('#lastAccess').html(data.lastAccess);
  $('#startTime').html(startTimeDef + startTag);
  $('#endTime').html(endTimeDef + endTag  + " UTC");
  $('#frequency').html(frequencyDef + freqTag);
  $('#main').show();

  // Add the devices to the list before the list item for the add device button (link)
  for (let device of data.devices) {
    $("#addDeviceForm").before("<li class='collection-item'>ID: " +
      device.deviceId + "<br> APIKEY: " + device.apikey + "<br> DeviceAuthToken: " + device.devAuthToken +
      "<br><br> <button id='ping-" + device.deviceId + "' class='waves-effect waves-light btn'>Update</button> " + " <button id='remove-" + device.deviceId + "' class='waves-effect waves-light btn'>Remove</button> " +
      " </li>");
    $("#ping-"+device.deviceId).click(function(event) {
      pingDevice(event, device.deviceId);
    });
    $("#remove-"+device.deviceId).click(function(event) {
      removeDevice(event, device.deviceId);
    });
  }

  console.log(data.readings); 
  console.log(data.readings.length); 

  for (let reading of data.readings) {
    var decode = JSON.parse(reading);
    var t1 = decode.time * 1000;
    var dateObject  = new Date(t1);
    var eztime = dateObject.toLocaleString();

    $("#data").before("<li>Device Id: " + decode.deviceId + " <br> Time: "+ eztime + "<br> Heartbeat: " + decode.heartBeat + "bpm <br> Oxygen Level: " + decode.oxygenLevel + "%</li><br>");
  }

}

function accountInfoError(jqXHR, textStatus, errorThrown) {
  // If authentication error, delete the authToken 
  // redirect user to sign-in page (which is index.html)
  if (jqXHR.status == 401) {
    window.localStorage.removeItem("authToken");
    window.location = "index.html";
  } 
  else {
    $("#error").html("Error: " + jqXHR.status);
    $("#error").show();
  }
}

// Registers the specified device with the server.
function registerDevice() {
  $.ajax({
    url: '/devices/register',
    method: 'POST',
    headers: { 'x-auth': window.localStorage.getItem("authToken") },  
    contentType: 'application/json',
    data: JSON.stringify({ deviceId: $("#deviceId").val(), devAuthToken: $("#deviceAuthToken").val()}), 
    dataType: 'json'
   })
     .done(function (data, textStatus, jqXHR) {
      
       hideAddDeviceForm();
       location.reload();//strategic reload
     })
     .fail(function(jqXHR, textStatus, errorThrown) {
       let response = JSON.parse(jqXHR.responseText);
       $("#error").html("Error: " + response.message);
       $("#error").show();
     }); 
}

function pingDevice(event, deviceId) {
   $.ajax({
        url: '/devices/ping',
        type: 'POST',
        headers: { 'x-auth': window.localStorage.getItem("authToken") },   
        data: { 'deviceId': deviceId }, 
        responseType: 'json',
        success: function (data, textStatus, jqXHR) {
          console.log("Pinged.");
        },
        error: function(jqXHR, textStatus, errorThrown) {
          var response = JSON.parse(jqXHR.responseText);
          $("#error").html("Error: " + response.message);
          $("#error").show();
        }
    }); 
}

function removeDevice(event, deviceId) {
   $.ajax({
        url: '/devices/remove',
        type: 'POST',
        headers: { 'x-auth': window.localStorage.getItem("authToken") },   
        data: { 'deviceId': deviceId }, 
        responseType: 'json',
        success: function (data, textStatus, jqXHR) {
          console.log("Removed.");
          location.reload(); //relaods the webpage
        },
        error: function(jqXHR, textStatus, errorThrown) {
          var response = JSON.parse(jqXHR.responseText);
          $("#error").html("Error: " + response.message);
          $("#error").show();
        }
    }); 
}

// Show add device form and hide the add device button (really a link)
function showAddDeviceForm() {
  $("#deviceId").val("");          // Clear the input for the device ID
  $("#addDeviceControl").hide();   // Hide the add device link
  $("#addDeviceForm").slideDown(); // Show the add device form
}

// Hides the add device form and shows the add device button (link)
function hideAddDeviceForm() {
  $("#addDeviceControl").show();   // Hide the add device link
  $("#addDeviceForm").slideUp();   // Show the add device form
  $("#error").hide();
}

$(function() {
  if (!window.localStorage.getItem("authToken")) {
    window.location.replace("index.html");
  }
  else {
    sendAccountRequest();
  }

  // Register event listeners
  $("#addDevice").click(showAddDeviceForm);
  $("#registerDevice").click(registerDevice);  
  $("#cancel").click(hideAddDeviceForm);  
});