let templateTheme =
  '<div class="accordion accordion-flush" id="accordion">' +
  '  <% for (let i = 0; i < template_list.length; i++) { %>' +
  '    <div class="accordion-item <%= template_list[i]._id %> card border-0">' +
  '      <h2 class="accordion-header d-flex justify-content-center" id="accordionHeader<%= i %>">' +
  '        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#accordion<%= i %>" aria-expanded="false" aria-controls="accordion<%= i %>" onClick="showTheme()" >' +
  '          <%= template_list[i].theme %>' +
  '        </button>' +
  '      </h2>' +
  '      <div id="accordion<%= i %>" class="accordion-collapse collapse" aria-labelledby="accordionHeader<%= i %>" data-bs-parent="#accordion">' +
  '        <div class="accordion-body">' +
  '          <div class="list-group list-group-flush <%= template_list[i].theme %>">' +
  '          </div>' +
  '        </div>' +
  '      </div>' +
  '    </div>' +
  '  <% } %>' +
  '</div>';

let templateQuestions =
  '<% for (let i = 0; i < question_list.length; i++) { %>' +
  '  <button type="button" class="list-group-item list-group-item-action <%= question_list[i].question %>" onClick="showQuestion()">' +
  '    <%= question_list[i].question %>' +
  '  </button>' +
  '<% } %>';

$(function () {
  $.ajax({
    url: '/api/questionnaires/',
    type: 'GET',
    json: true,
    success: function (response) {
      const questionnaires = response.questionnaires;
      const select = $('#questionnaireSelect');
      for (let i = 0; i < questionnaires.length; i++) {
        select.append('<option value="' + questionnaires[i]._id + '">' + questionnaires[i].title + '</option>');
      }
    },
    error: function (err) {
      console.error(err);
    }
  });
});

editQuestionnaire = function () {
  const questionnaireId = $('#questionnaireSelect').val();
  $.ajax({
    url: '/api/questionnaires/' + questionnaireId,
    type: 'GET',
    json: true,
    success: function (response) {
      try {
        const questionnaire = response.questionnaire;
        const template = $('#template');
        var html = ejs.render(
          '<h2><div onClick="showQuestionnaire()"><%= questionnaire.title%> </div></h2>' + templateTheme,
          { template_list: questionnaire.themes, questionnaire: questionnaire }
        );
        template.html(html);

        // Initialize the accordion
        for (let i = 0; i < questionnaire.themes.length; i++) {
          var html = ejs.render(templateQuestions, { question_list: questionnaire.themes[i].questions });
          $('.' + questionnaire.themes[i].theme).html(html);
        }
      } catch (err) {
        console.error(err);
      }
    },
    error: function (err) {
      console.error(err);
    }
  });
};

showQuestionnaire = function () {
  console.log('showQuestionnaire');
  $('#questionnaireForm').show();
  $('#themeForm').hide();
  $('#questionForm').hide();
};

showTheme = function () {
  console.log('showTheme');
  $('#questionnaireForm').hide();
  $('#themeForm').show();
  $('#questionForm').hide();
};

showQuestion = function () {
  console.log('showQuestion');
  $('#questionnaireForm').hide();
  $('#themeForm').hide();
  $('#questionForm').show();
};
