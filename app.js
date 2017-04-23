var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');
var redis = require('redis').createClient();
app.listen(8000);
function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            res.writeHead(200);
            res.end(data);
        });
}
var users = [];

io.on('connection', function (socket) {
    console.log('Кто-то подключился к основному каналу! ' + socket.id + ' ' + socket.rooms);


    socket.on('hello:back', function () {
        console.log('Back received!');
        redis.lrange('addicted', 0, -1, function (err, reply) {
            console.log(reply);
            var _arr = [];
            for(var i = 0; i < reply.length; i++){
                _arr.push(JSON.parse(reply[i]));
            }
            socket.json.emit('server:back', { listof: _arr});
        });
    });

    socket.on('hello', function (data) {
        socket.name = data.nick;
        if(users.indexOf(socket.name) > -1) {
            socket.emit('hello:error', {data: 'Такой ник уже занят'})
        } else {
            console.log('Подцепился юзер с ником ' + socket.name);
            users.push(data.nick);
            socket.json.emit('server:hello', {users: users});
            redis.lrange('addicted', -10,-1,function (err, reply) {
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

    socket.on('attack', function(data){
        console.log('Кто-то кого-то пидаром обозвал! ' + data.user);
        socket.broadcast.emit('server:attack', {user: data.user, by: data.by});
        socket.emit('server:attack', {user: data.user, by: data.by});
    });


    socket.on('keying', function (data) {
        socket.broadcast.emit('server:keying', {nick: data.nick, action: 'чё-то набирает...'})
    });

    socket.on('vote:post',function (data) {
        console.log(data.item);
        redis.lindex('addicted', data.index, function (err, reply) {
            console.log('lindex', reply);
            var voteForThis = JSON.parse(reply);
            if (typeof(voteForThis.mark) === 'undefined'){
                voteForThis.mark = 0;
            }
            voteForThis.mark++;
            redis.lset('addicted', data.index, JSON.stringify(voteForThis), function (err,reply) {
                socket.emit('server:voted', {index: data.index});
                socket.broadcast.emit('server:voted', {index: data.index});
            })
        });

    });

    socket.on('mess', function (data) {
        const store = function () {
            data.mark = 0;
            return redis.rpush('addicted', JSON.stringify(data),function (err, reply) {
                console.log(reply)
            });
        };
        var pic = data.data.substring(data.data.length - 3);
        if ((pic === 'png') || (pic === 'bmp') || (pic === 'jpg') || (pic === 'gif')) {
            console.log('Опа, картинка! ' + data.data);
            var img = data.data;
            data.data = "<img src='" + img + "' class='img-responsive' alt='Responsive image'/></img>";
            store();
        } else if (data.data.indexOf('www.youtube.com/watch') > -1) {
            console.log('Наверно, ютюб! ' + data.data);
            var video = data.data.replace("watch?v=", "/embed/");
            data.data = "<iframe width='660' height='415' src='" + video + "' frameborder='0' allowfullscreen></iframe>";
            store();
        } else if (data.data.indexOf('http') === 0) {
            console.log('Ссылка! ' + data.data);
            var link = data.data;
            data.data = "<a href='" + link + "'/>" + link +"</a>";
            store();
        } else {
            console.log('Обычное сообщение! ' + data.data);
            store()
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