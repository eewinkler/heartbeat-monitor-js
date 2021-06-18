
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
  localStorage.setItem("email", data.email);
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


function sendChangeRequest() {
  let email = localStorage.getItem("email");
  let startTime = $('#startTime').val();
  let endTime = $('#endTime').val();
  let frequency = $('#frequency').val();
  
  $.ajax({
    url: '/users/frequency',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({email:email, startTime:startTime, endTime:endTime, frequency:frequency}),
    dataType: 'json'
  })
    .done(registerSuccess)
    .fail(registerError);
}

function registerSuccess(data, textStatus, jqXHR) {
  if (data.success) {  
    window.location = "index.html";
  }
  else {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Error: " + data.message + "</span>");
    $('#ServerResponse').show();
  }
}

function registerError(jqXHR, textStatus, errorThrown) {
  if (jqXHR.statusCode == 404) {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Server could not be reached.</p>");
    $('#ServerResponse').show();
  }
  else {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Error: " + jqXHR.responseJSON.message + "</span>");
    $('#ServerResponse').show();
  }
}

$(function () {
  if (!window.localStorage.getItem("authToken")) {
    window.location.replace("index.html");
  }
  else {
    sendAccountRequest();
    //getTheData();
  }

  $('#freq').click(sendChangeRequest);
});
