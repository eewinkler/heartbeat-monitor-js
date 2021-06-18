function sendRegisterRequest() {
  let email = $('#email').val();
  let password = $('#password').val();
  let fullName = $('#fullName').val();
  let passwordConfirm = $('#passwordConfirm').val();
  
  let strongPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
  let emailCheck = /\S+@\S+\.\S+/;

  // Check to make sure the passwords match
  // FIXME: Check to ensure strong password 

  if ((emailCheck.test(email)) == false) {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Email address invalid format.</span>");
    $('#ServerResponse').show();
    return;
  }

  if ((strongPass.test(password)) == false) {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Password is not strong enough. Please include at least one digit, one lowercase letter, and one uppercase letter. Also, your password must be a length of at least 8 characters.</span>");
    $('#ServerResponse').show();
    return;
  }

  if (password != passwordConfirm) {
    $('#ServerResponse').html("<span class='red-text text-darken-2'>Passwords do not match.</span>");
    $('#ServerResponse').show();
    return;
  }
  
  $.ajax({
    url: '/users/register',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({email:email, fullName:fullName, password:password}),
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
  $('#signup').click(sendRegisterRequest);
});

