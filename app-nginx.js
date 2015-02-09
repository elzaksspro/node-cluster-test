
var express = require("express");
var port = process.env.PORT||3001;
var app = express();
app.get('*', function (req, res) {
    res.send('hello');
});
app.listen(port, function () {
    console.log('server listening on:', port);
});