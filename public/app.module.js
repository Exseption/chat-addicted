angular.module('addicted', ['ngSanitize', 'ngCookies', 'ui.router', 'ngFileUpload', 'ngAnimate'])
    .config(function ($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise('/index');
        $stateProvider
            .state('nicks', {
                url: '/nicks',
                templateUrl:"nicks.html"
            })
            .state('log', {
                url:'/log',
                templateUrl: 'log.html'
            })
            .state('game', {
                url: '/game',
                template: "<div style='border: solid 1px #666666; min-width: 500px; min-height: 500px; margin-bottom: 5px'>" +
                "<canvas id='#renderCanvas'></canvas>" +
                "</div>"
            })
    })
    .service('Session', function ($interval) {
        $interval(function(){
            console.log('Test!')
        },50000)
    })
    .directive('chat', function (socket, $sce, $timeout, $cookies, Upload,$window) {
        return {
            transclude: true,
            templateUrl: 'chat.html',
            link: function (scope, elem, attrs) {
                scope.submit = function(){ //function to call on form submit
                    if (scope.upload_form.file.$valid && scope.file) { //check if from is valid
                        scope.upload(scope.file); //call upload function
                    }
                };
                scope.upload = function (file) {
                    Upload.upload({
                        url: 'http://localhost:3000/upload', //webAPI exposed to upload the file
                        data:{file:file} //pass file as data, should be user ng-model
                    }).then(function (resp) { //upload function returns a promise
                        if(resp.data.error_code === 0){ //validate success
                            $window.alert('Success ' + resp.config.data.file.name + 'uploaded. Response: ');
                        } else {
                            $window.alert('an error occured');
                        }
                    }, function (resp) { //catch error
                        console.log('Error status: ' + resp.status);
                        $window.alert('Error status: ' + resp.status);
                    }, function (evt) {
                        console.log(evt);
                        let progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                        console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
                        scope.progress = 'progress: ' + progressPercentage + '% '; // capture upload progress
                    });
                };
                $('input#i_message').characterCounter();
                $('#modal1').modal();
                $('.scrollspy').scrollSpy();
                $('.materialboxed').materialbox();
                var myNick = undefined;
                scope.entered = false;
                socket.init('http://192.168.88.13:8000'); //init url
                scope.enterToChat = function (nick, chk) {
                    if(chk){
                        $cookies.put('user', nick);
                    }
                    myNick = nick;
                    scope._myNick = myNick;
                    scope.entered = true;
                    socket.emit('hello', { nick: nick })
                };
                if($cookies.get('user')){
                    var user = $cookies.get('user');
                    scope.enterToChat(user, null);
                }
                scope.attack = function (user) {
                    socket.emit('attack', {user: user, by: myNick})
                };
                scope.vote = function (item, index) {
                    socket.emit('vote:post', {item: item.data, index: index});
                    console.log((index + 1) + " " +item.data)
                };
                socket.on('server:voted', function (index) {
                    if(!scope.messages[index.index].mark){
                        scope.messages[index.index].mark = 0;
                    }
                    scope.messages[index.index].mark++;
                    Materialize.toast('Спасибо за ваш голос!',2000);
                });
                socket.on('server:attack', function (data) {
                    console.log('Ники '+ myNick + ' ' + data.user);
                    const by = data.by;
                    if(myNick === data.user){
                        angular.element(document.querySelector('#faggot')).append("<h1>"+ by +" пнул тебя с чата!</h1>");
                        $timeout(function () {
                            angular.element(document.querySelector('#faggot')).html('');
                            $window.location.reload();
                            $cookies.remove('user');
                        }, 2000);


                    }
                });
                scope.forgiveMe = function () {
                    $cookies.remove('user');
                    $window.location.reload();
                };
                var keying = '';
                socket.on('server:keying', function (data) {
                    scope.keying = 'Пользователь ' + data.nick + ' ' + data.action;
                    $timeout(function () {
                        scope.keying = '';
                    }, 1000)
                });
                angular.element(document.querySelector('#message_body'))
                    .bind('keydown keypress', function (event) {
                        socket.emit('keying', {nick: myNick})
                    });
                const scroll = function () {
                    return $timeout(function() {
                        var scroller = document.getElementById("chatDiv");
                        scroller.scrollTop = scroller.scrollHeight;
                    }, 0, false);
                };
                scope.backed = false;
                scope.back = function () {
                    console.log('Emitting back!');
                    socket.emit('hello:back', {});
                    scope.backed = true;
                };
                socket.on('server:back', function (back) {
                    scope.messages = [];
                    for(var i = 0; i < back.listof.length; i++) {
                        scope.messages.push(back.listof[i])
                    }
                    Materialize.toast('Предыдущие сообщения загружены, лол', 2000);

                });
                socket.on('server:stored-messages',function (data) {
                    console.log(data);
                    for(var i =0; i < data.listof.length; i++){
                        scope.messages.push(data.listof[i])
                    }
                    scroll();
                });
                scope.users = undefined;
                socket.on('hello:error', function (data) {
                    alert(data.data);
                    scope.entered = false;
                });
                socket.on('server:hello', function (users) {
                    $('.tooltipped').tooltip({delay: 50});
                    console.log(users);
                    scope.users = users.users;
                });
                scope.remove_post = function (post, index) {
                    console.log('Удаляем пост ' + post);
                    socket.emit('remove_post', {
                        nick: post.nick,
                        data: post.data,
                        date: post.date,
                        mark: post.mark,

                        index: index
                    })
                };
                socket.on('server:remove_post', function (data) {
                    console.log('Удаляем элемент с индексом ' + data.index);
                    scope.messages.splice(data.index,1);
                    Materialize.toast('Сообщение успешно удалено!', 2000);
                });
                scope.messages = [];
                var options = {
                    era: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                    timezone: 'UTC',
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric'
                };
                scope.nicks = [];
                socket.on('server:nicks', function (data) {
                    scope.nicks = data.nicks;
                    Materialize.toast('Добро пожаловать в чат, ёпта!', 2000);


                });
                socket.on('s:mess', function (data) {
                    var date = new Date().toLocaleDateString('ru', options);
                    date = date.substring(date.length-8);
                    data.date = date;
                    scope.messages.push(data);
                    console.log('Общее ' + data);
                    scroll();
                });
                socket.on('message',function (data) {
                    var date = new Date().toLocaleDateString('ru', options);
                    date = date.substring(date.length-8);
                    data.date = date;
                    scope.messages.push(data);
                    console.log('Общее ' + data);
                    scroll();

                });
                scope.send = function (mess) {
                    var date = new Date().toLocaleDateString('ru', options);
                    date = date.substring(date.length-8);
                    socket.emit('mess', { nick: myNick, data: mess, date:date});
                    scope.i_message = '';
                    scroll();
                };

            }
        }
    })
    .filter('unsafe', function($sce) {
        return $sce.trustAsHtml; })
    .filter('fuckNick', function () {
        return function (nick) {
            return nick.substring(0,20);
        }
    })
    .factory('socket',function ($rootScope){
        var socket;
        return {
            init: function (url) {
                socket = io(url);
            },
            on: function (eventName,callback){
                socket.on(eventName,function(){
                    var args = [].slice.call(arguments);
                    $rootScope.$apply(function(){
                        if(callback){
                            callback.apply(socket,args);
                        }
                    });
                });
            },
            emit: function (eventName, data, callback){
                var args = [].slice.call(arguments), cb;
                if( typeof args[args.length-1]  == "function" ){
                    cb = args[args.length-1];
                    args[args.length-1] = function(){
                        var args = [].slice.call(arguments);
                        $rootScope.$apply(function(){
                            if(cb){
                                cb.apply(socket,args);
                            }
                        });
                    };
                }
                socket.emit.apply(socket, args);
            }
        };
    })