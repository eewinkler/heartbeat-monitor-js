function sendAccountRequest() {
  $.ajax({
    url: '/users/account',
    method: 'GET',
    headers: { 'x-auth': window.localStorage.getItem("authToken") },
    dataType: 'json'
  })
    .done(accountInfoSuccess)
    .fail(accountInfoError);
}

function accountInfoSuccess(data, textStatus, jqXHR) {
  $('#main').show();
  console.log(data); 
  //set default Device ID
  $('#deviceID').html(data.devices[0].deviceId);
  $('#apiKey').html(data.devices[0].apikey);

  //variables for daily feed display
  var s1 = {
    label: 'Average BPM',
    borderColor: 'red',
    data: [],
    lineTension: 0,
    pointHoverRadius: 10,
    pointHitRadius: 20,
    fill: false
  };

  var s2 = {
    label: 'O2 Level',
    borderColor: 'blue',
    data: [],
    lineTension: 0,
    pointHitRadius: 20,
    pointHoverRadius: 20,
    fill: false
  };

  var minO2 = 100;
  var maxO2 = 0;
  var minBPM = 300;
  var maxBPM = 0;
  var sum = 0;
  var count = 0;

  var today = (Date.now() / 1000).toFixed(0);
  console.log(today);

  console.log(data.readings);

  for (let reading of data.readings) {
    var decode = JSON.parse(reading);

    let t1 = decode.time * 1000;
    let dateObject  = new Date(t1);
    let eztime = dateObject.toLocaleString();

    $("#data").before("<li>Device Id: " + decode.deviceId + " <br> Time: "+ eztime + "<br> Heartbeat: " + decode.heartBeat + "bpm <br> Oxygen Level: " + decode.oxygenLevel + "%</li><br>");
    
    // == Daily Calculation == 
    //{ x: '2017-01-06 18:00:00', y: 90 },
    if(today - decode.time <= 86400){ //if the resutls are within 24 hours
      var temp1 = { x: eztime, y: decode.heartBeat};
      var temp2 = { x: eztime, y: decode.oxygenLevel};

      s1.data.push(temp1);
      s2.data.push(temp2);
    }
    // == weekly stats calculation == 
    if(today - decode.time <= 604800){ //if the resutls are within a week
      if(Number(decode.heartBeat) > maxBPM){
        maxBPM = Number(decode.heartBeat);
      }
      if(Number(decode.heartBeat) < minBPM){
        minBPM = Number(decode.heartBeat);
      }
      if(Number(decode.oxygenLevel) > maxO2){
        maxO2 = Number(decode.oxygenLevel);
      }
      if(Number(decode.oxygenLevel) < minO2){
        minO2 = Number(decode.oxygenLevel);
      }
      //calc averages
      sum = sum + Number(decode.heartBeat);
      count = count + 1;
    }
  
  }

  //calculate the averages and display the minimums
  $('#averagew').html( (sum/count) +" BPM");
  $('#minw').html("     BPM: "+minBPM+", O2: "+ minO2);
  $('#maxw').html("     BPM: "+maxBPM+", O2: "+ maxO2);

  //create the graph!
  var ctx = document.getElementById('dailychart').getContext('2d');
  var chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [s1, s2] },
    options: {
      scales: {
        xAxes: [{
          type: 'time'
        }]
      },
      lineTension: 0
    }
  });

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

function sendData() { //function to send the data to the server for testing
  let hb = $("#avgBPM").val();
  let ol = $("#oxygenLevel").val();
  let t = $("#time").val();
  let id = $("#deviceID").text();
  let k = $("#apiKey").text();

  let ti = Date.parse(t)/1000;

  console.log(hb + " "+ ol +" "+ t +" "+ id+" "+ k);

  $.ajax({
    url: '/users/incomingData',
    method: 'POST',
    data: {avgBPM: hb, avgO2: ol, time: ti, deviceId: id, apikey: k},
    dataType: 'json'
  })
  //.done(dataInfoSuccess)

  window.location.replace("report.html");
}

$(function() {
  if (!window.localStorage.getItem("authToken")) {
    window.location.replace("index.html");
  }
  else {
    sendAccountRequest();
  }

  // Register event listeners 
  $("#submit").click(sendData);
});