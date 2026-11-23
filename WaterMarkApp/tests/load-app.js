// Loads the single-file app (../web/index.html) in a same-origin iframe and hands its window to the test.
// Must be served over HTTP: on file:// browsers treat each file as a separate origin.
window.loadApp = function (run) {
  'use strict';
  var summary = document.getElementById('summary');
  var HINT = 'Open via a local server: python -m http.server 8000 (from the repo root), ' +
    'then open http://localhost:8000' + location.pathname.replace(/^.*(\/tests\/)/, '$1');

  function notRun(reason) {
    summary.textContent = 'NOT RUN — ' + reason;
    summary.className = 'fail';
    document.body.setAttribute('data-result', 'not-run');
  }

  if (location.protocol === 'file:') {
    notRun(HINT);
    return;
  }

  var frame = document.createElement('iframe');
  frame.src = '../web/index.html';
  frame.width = '360';
  frame.height = '640';
  frame.title = 'App under test';
  frame.style.position = 'absolute';
  frame.style.left = '-10000px';
  frame.style.visibility = 'hidden';
  frame.addEventListener('load', function () {
    var app;
    try {
      app = frame.contentWindow;
      if (!app.WatermarkCore || !app.WatermarkI18n) {
        throw new Error('app hooks not found');
      }
    } catch (e) {
      notRun('could not access the app (' + e.message + '). ' + HINT);
      return;
    }
    run(app);
  });
  document.body.appendChild(frame);
};
