const { onRequest } = require('firebase-functions/v2/https');
  const server = import('firebase-frameworks');
  exports.ssrstudio4224486386c415 = onRequest({"region":"us-central1"}, (req, res) => server.then(it => it.handle(req, res)));
  