var http = require('http'),
    httpProxy = require('http-proxy');

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

// To modify the proxy connection before data is sent, you can listen
// for the 'proxyReq' event. When the event is fired, you will receive
// the following arguments:
// (http.ClientRequest proxyReq, http.IncomingMessage req,
//  http.ServerResponse res, Object options). This mechanism is useful when
// you need to modify the proxy request before the proxy connection
// is made to the target.
//
proxy.on('proxyReq', function(proxyReq, req, res, options) {
  proxyReq.setHeader('X-Special-Proxy-Header', 'foobar');
});

var server = http.createServer(function(req, res) {
  // You can define here your custom logic to handle the request
  // and then proxy the request.
  console.log(req.url)
  const isFile = req.url.includes(".js") || req.url.includes(".css") || req.url.includes(".html")
  proxy.web(req, res, {
    target: isFile
      ? "http://localhost:8081"
      : "http://101.132.168.128:8081",
  });

  proxy.on("error", (err) => {
    console.log("Err -> ", err)
  })
});

console.log("listening on port 5050")
server.listen(5050);