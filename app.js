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
var another = io.of('/another');
another.on('connection', function (socket) {
    console.log('Кто-то подключился к другому каналу!');
    socket.send('Пдключился к другой комнате!')
})

io.on('connection', function (socket) {
    console.log('Кто-то подключился к основному каналу!')
    socket.on('message', function (data) {
        console.log(data);
    });
    socket.on('mess', function (data) {
        console.log("Сообщение от "+ data.nick + " " + data.data);
        socket.json.send({nick: 'Вы', data: data.data});
        socket.broadcast.emit('s:mess', {data: data.data, nick: data.nick})

    })
});