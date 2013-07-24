var fs = require('fs'),
    server = require('webserver').create(),
    system = require('system'),
    webpage = require('webpage');
    

var addr_port = '127.0.0.1:8000';
var service = server.listen(addr_port, function(request, response) {
    console.log(request.url, request.postRaw);
    if (request.method != 'POST') {
        response.statusCode = 405;
        response.setHeader('Allow', 'POST');
        response.write('Only POST allowed');
        response.close();
        return;
    }

    var url = request.post.url;

    if (!url) {
        response.statusCode = 400;
        response.write('Please specify a url to render.');
        response.close();
    } else {
        render(url, function(content, content_length) {
            response.statusCode = 200;
            response.setEncoding('binary');
            // Don't know if we can trust the string length for a binary string.
            response.setHeader('Content-Length', content_length);
            response.write(content);
            response.close();
        }, function (error) {
            response.statusCode = 500;
            response.write(error);
            response.close();
        });
    }
});


if (service) console.log('Server listening on ' + addr_port);
else {
    console.log('Server failed to start');
    phantom.exit();
}


function render(url, on_success, on_error, args) {
    if (!url) {
        on_error('No URL specified!');
        return;
    }

    args = args || {};
    args.format = args.format || 'pdf';
    args.viewportSize = args.viewportSize || { width: 1024, height: 786 };
    args.paperSize = args.paperSize || {format: 'Letter', orientation: 'portrait', margin: '1cm'};

    var output = ('/tmp/shotserver-render-' +
                  (new Date().toISOString()) + '-' +
                  Math.floor(Math.random() * 1000) +
                  '.' + args.format)

    console.log('Rendering ' + url + ' to ' + output);

    var page = webpage.create();

    page.viewportSize = args.viewportSize;
    if (args.format === 'pdf') page.paperSize = args.paperSize;
    if (args.zoomFactor) page.zoomFactor = args.zoomFactor;

    try {
        page.open(url, function (status) {
            if (status !== 'success') {
                on_error('Unable to load the address! ' + url);
                page.close();
            } else {
                window.setTimeout(function () {
                    page.render(output);

                    var f = fs.open(output, 'rb')
                    var content = f.read();
                    var content_length = fs.size(output);
                    f.close();
                    fs.remove(output);
                    
                    on_success(content, content_length);
                    page.close();
                }, 200);
            }
        });
    } catch(e) {
        page.close();
    }
}