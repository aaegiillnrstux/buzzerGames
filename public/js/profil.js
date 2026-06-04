// jshint esversion:8
$('#changePassword').on('submit', function (e) {
  e.preventDefault();
  const oldPassword = $('#oldPassword').val();
  const newPassword = $('#newPassword').val();
  $('.btn').prop('disabled', true);
  $('#submit-text').hide();
  $('#submit-spinner').show();
  fetch('/api/changePassword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      oldPassword,
      newPassword
    })
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === 'success') {
        $('#liveAlertPlaceholder').html(`
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <strong>Success !</strong> ${data.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
        $('#submit-text').show();
        $('#submit-spinner').hide();
        $('.btn').prop('disabled', false);
      } else {
        $('#liveAlertPlaceholder').html(`
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <strong>Error !</strong> ${data.error}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
        $('#submit-text').show();
        $('#submit-spinner').hide();
        $('.btn').prop('disabled', false);
      }
    });
});
