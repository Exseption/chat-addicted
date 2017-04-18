// var redisClient = require('redis-connection')();
//
// var arr = [1,8,88];
// var multi = redisClient.multi()
// for (var i=0; i<arr.length; i++) {
//     multi.rpush('testlist', arr[i]);
// }
//
// multi.exec(function(errors, results) {
//     console.log(results)
// });

var redis = require('redis');
var client = redis.createClient();
client.on('connect', function() {
    console.log('connected');
});
client.rpush('test', 324, function(err, reply) {
    console.log(reply); //prints 2
});
client.lrange('test', 0, -1, function(err, reply) {
    console.log(reply); // ['angularjs', 'backbone']
});
//
// redisClient.set('hello', 'world');
// redisClient.get('hello', function (err, reply) {
//     console.log('hello', reply.toString()); // hello world
// });