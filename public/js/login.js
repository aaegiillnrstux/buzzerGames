// jshint esversion:8
$('#loginForm').on('submit', function (e) {
  e.preventDefault();
  const username = $('#PseudoInput').val();
  const password = $('#PasswordInput').val();
  $('.btn').prop('disabled', true);
  $('#submit-text').hide();
  $('#submit-spinner').show();
  fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === 'success') {
        window.location.href = '/home';
      } else {
        alert('ERROR ! ' + data.error);
        $('#submit-text').show();
        $('#submit-spinner').hide();
        $('.btn').prop('disabled', false);
      }
    });
});
