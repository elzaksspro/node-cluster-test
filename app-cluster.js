/**
 * Created by tommytang on 2/8/15.
 */
var cluster = require("cluster");
var http = require("http");
var numCPUs = require("os").cpus().length;
console.log("numCPUs\n", numCPUs);
var express = require("express");

if (cluster.isMaster) {
    console.log('Fork % worker from master:', numCPUs);
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('online', function (worker) {
        console.log('worker is running on %s pid', worker.process.pid);
    });
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker with %s is closed', worker.process.pid);
    });
} else if (cluster.isWorker) {
    var port = 8000;
    console.log('worker (%s) is now listening to http://localhost:%s', cluster.worker.process.pid, port);
    var app = express();
    app.get('*', function (req, res) {
        res.send('hello');
    });
    app.listen(port, function () {
        console.log('server listening on:', port);
    });
}