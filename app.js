var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8000);

function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            res.end(data);
        });
}
io.on('connection', function (socket) {
    socket.on('mess', function (data) {
        console.log("Сообщение от "+ data.nick + " " + data.data);
        socket.send(data);
        socket.broadcast.emit('s:mess', {data: data.data, nick: data.nick})

    })
});