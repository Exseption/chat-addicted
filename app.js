var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
app.listen(8000);
function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            res.writeHead(200);
            res.end(data);
        });
}

var red = require('redis');
var redis = red.createClient();

var another = io.of('/another');
another.on('connection', function (socket) {
    console.log('Кто-то подключился к другому каналу!');
    socket.send('Пдключился к другой комнате!')
});
var users = [];
io.on('connection', function (socket) {
    console.log('Кто-то подключился к основному каналу! ' + socket.id);
    socket.on('hello', function (data) {
        socket.name = data.nick;
        if(users.indexOf(socket.name) > -1) {
            socket.emit('hello:error', {data: 'Такой ник уже занят'})
        } else {
            console.log('Подцепился юзер с ником ' + socket.name);
            users.push(data.nick);
            socket.json.emit('server:hello', {users: users});
            redis.lrange('addicted',0,-1,function (err, reply) {
                console.log(reply);
                var _arr = [];
                for(var i = 0; i < reply.length; i++){
                    _arr.push(JSON.parse(reply[i]));
                }
                socket.json.emit('server:stored-messages', {listof: _arr});
            });


            socket.broadcast.emit('server:hello', {users: users})
        }
    });
    socket.on('mess', function (data) {

        console.log('Обычное сообщение!' + data.data);
        var pic = data.data.substring(data.data.length - 3);
        if((pic === 'png') || (pic === 'bmp') || (pic === 'jpg') || (pic === 'gif')) {
            console.log('Опа, картинка!');
            var img = data.data;
            data.data = "<img src='" + img + "'/></img>";
            redis.rpush('addicted', JSON.stringify(data),function (err, reply) {
                console.log(reply)
            });
        } else if(data.data.indexOf('http') === 0){
            console.log('Ссылка!');
            var link = data.data;
            data.data = "<a href='" + link + "'/>" + link +"</a>";
            redis.rpush('addicted', JSON.stringify(data),function (err, reply) {
                console.log(reply)
            });
        }
        socket.json.send({ nick: 'Вы', data: data.data });
        socket.broadcast.emit('s:mess', {data: data.data, nick: data.nick})
    }
);
    
    socket.on('disconnect', function () {
        console.log('Отвалился '+ socket.name);
        var index = users.indexOf(socket.name);
        if(index > -1){
            users.splice(index,1);
            socket.json.emit('server:hello', {users: users});
            socket.broadcast.emit('server:hello', {users: users})
        }
    })
});