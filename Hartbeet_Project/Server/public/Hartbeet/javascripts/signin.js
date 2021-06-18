function sendSigninRequest() {
  $.ajax({
    url: '/users/signin',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ email: $('#email').val(), password: $('#password').val() }),
    dataType: 'json'
  })
    .done(signinSuccess)
    .fail(signinFailure);
}

function signinSuccess(data, testStatus, jqXHR) {
  console.log(data.authToken);
  window.localStorage.setItem('authToken', data.authToken);
  window.location = "account.html";
}

function signinFailure(jqXHR, testStatus, errorThrown) {
  if (jqXHR.status == 401 ) {
     $('#ServerResponse').html("<span class='red-text text-darken-2'>Error: " +
                               jqXHR.responseJSON.message +"</span>");
     $('#ServerResponse').show();
  }
  else {
     $('#ServerResponse').html("<span class='red-text text-darken-2'>Server could not be reached.</span>");
     $('#ServerResponse').show();
  }
}

$(function() {
  if( window.localStorage.getItem("authToken") ) {
    window.location.replace("account.html");
  }

  $("#signin").click(sendSigninRequest);
  $("#password").keypress(function(event) {
    if (event.which === 13) {
      sendSigninRequest();
    }
  });
});