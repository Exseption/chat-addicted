const fs = require('fs');
const redis = require('redis').createClient(3339, '50.30.35.9');
redis.auth('brainsurgery','26c9c6f6ddb2a2ee1ad24355eaec3744');
const express = require('express'),
    path = require('path'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override');
const multer = require('multer');
const storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        let datetimestamp = Date.now();
        cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
});
const upload = multer({ //multer settings
        storage: storage
        }).single('file');
app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser({uploadDir: './uploads'}));
app.use(methodOverride('X-HTTP-Method-Override'));
app.disable('x-powered-by');
app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.send(err);
    });
}
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send(err);
});
const server = app.listen(8000);
app.post('/upload', function(req, res) {
    upload(req,res,function(err){
        if(err){
            res.json({error_code:1,err_desc:err});
            return;
        }
        res.json({error_code:0,err_desc:null});
    })
});
const io = require('socket.io')(server);
let users = [];
io.on('connection', function (socket) {
    let addr = socket.handshake.address;
    console.log(new Date() + ' Кто-то подключился к основному каналу! ' + addr.substring(addr.length - 13));


    socket.on('hello:back', function () {
        console.log(new Date() + ' Back sended!');
        redis.lrange('addicted', 0, -1, function (err, reply) {
            //console.log(reply);
            var _arr = [];
            for(let i = 0; i < reply.length; i++){
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
            redis.lrange('nicks',0, -1, function (err, reply) {
                let _arr = [];
                for(var i = 0; i < reply.length; i++){
                    _arr.push(reply[i]);
                }
                if (_arr.indexOf(data.nick) === -1){
                    redis.rpush('nicks', data.nick, function (err, reply) {
                        console.log(new Date() + ' Добавлен новый ник в базу! ' + data.nick)
                        _arr.push(data.nick);
                    });
                }
                socket.broadcast.emit('server:nicks', {nicks: _arr});
                socket.emit('server:nicks', {nicks: _arr});
            });
            console.log(new Date() + ' Подцепился юзер с ником ' + socket.name);
            users.push(data.nick);
            socket.json.emit('server:hello', {users: users});
            redis.lrange('addicted', -10, -1, function (err, reply) {
                //console.log(reply);
                let _arr = [];
                for(let i = 0; i < reply.length; i++){
                    _arr.push(JSON.parse(reply[i]));
                }
                socket.json.emit('server:stored-messages', {listof: _arr});
            });
            socket.broadcast.emit('server:hello', {users: users})
        }
    });
    socket.on('attack', function(data){
        console.log(new Date() + ' Кто-то кого-то пнул с чата! ' + data.user);
        socket.broadcast.emit('server:attack', {user: data.user, by: data.by});
        socket.emit('server:attack', {user: data.user, by: data.by});
    });
    socket.on('keying', function (data) {
        socket.broadcast.emit('server:keying', {nick: data.nick, action: 'чё-то набирает...'})
    });
    socket.on('vote:post',function (data) {
        console.log(new Date() + ' ' + data.item);
        redis.lindex('addicted', data.index, function (err, reply) {
            //console.log('lindex', reply);
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
    socket.on('remove_post', function (data) {
        console.log(new Date() + ' Кто-то хочет удалить пост c индексом ' + data.index);
        let obj = {
            nick: data.nick,
            data: data.data,
            date: data.date,
            mark: data.mark
        };
        console.log(new Date() + ' ' + JSON.stringify(obj));
        redis.lrem('addicted', 0, JSON.stringify(obj), function (err, reply) {
            console.log(reply);

            socket.broadcast.emit('server:remove_post', {index: data.index});
            socket.emit('server:remove_post', {index: data.index});
        })
    });
    socket.on('mess', function (data) {
        const store = function () {
            data.mark = 0;
            return redis.rpush('addicted', JSON.stringify(data),function (err, reply) {
                //console.log(reply)
            });
        };
        let pic = data.data.substring(data.data.length - 3);
        if ((pic === 'png') || (pic === 'bmp') || (pic === 'jpg') || (pic === 'gif') || (pic === 'peg')) {
            console.log(new Date() + ' Опа, картинка! ' + data.data);
            let img = data.data;
            data.data = "<img src='" + img + "' class='img-responsive'/></img>";
            store();
        } else if (data.data.indexOf('www.youtube.com/watch') > -1) {
            console.log(new Date() + ' Наверно, ютюб! ' + data.data);
            let video = data.data.replace("watch?v=", "/embed/");
            data.data = "<div class='video-container'><iframe width='660' height='415' src='" + video + "' frameborder='0' allowfullscreen></iframe></div> ";
            store();
        } else if (data.data.indexOf('http') === 0) {
            console.log(new Date() + ' Ссылка! ' + data.data);
            let link = data.data;
            data.data = "<a href='" + link + "'/>" + link +"</a>";
            store();
        } else {
            console.log(new Date() + ' Обычное сообщение! ' + data.data);
            store()
        }
        socket.json.send({ nick: 'Вы', data: data.data, date: data.date });
        socket.broadcast.emit('s:mess', {data: data.data, nick: data.nick, date: data.date})
    }
);
    socket.on('disconnect', function () {
        console.log(new Date() + ' Отвалился '+ socket.name);
        let index = users.indexOf(socket.name);
        if(index > -1){
            users.splice(index,1);
            socket.json.emit('server:hello', {users: users});
            socket.broadcast.emit('server:hello', {users: users})
        }
    })
});