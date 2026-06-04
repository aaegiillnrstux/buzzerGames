// jshint esversion:8
$('#registerForm').on('submit', async function (e) {
  e.preventDefault();
  const email = $('#EmailInput').val();
  const username = $('#PseudoInput').val();
  const password = $('#PasswordInput').val();
  $('.btn').prop('disabled', true);
  $('#submit-text').hide();
  $('#submit-spinner').show();
  const result = await fetch('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      username,
      password
    })
  }).then((res) => res.json());
  if (result.status === 'success') {
    window.location.href = '/home';
  } else {
    alert('ERROR ! ' + result.error);
    $('#submit-text').show();
    $('#submit-spinner').hide();
    $('.btn').prop('disabled', false);
  }
});
