# Node Cluster VS Nginx load balance

## 实验步骤

### 1. 引入express

```Json
{
  "name": "cluster-test",
  "version": "0.0.0",
  "description": "",
  "main": "app-nginx.js",
  "dependencies": {
    "express": "~4.8.1"
  },
  "devDependencies": {},
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}

```

### 2. 编写 `nginx load balance` 版本的app.js

```Javascript
var express = require("express");
var port = process.env.PORT||3001;
var app = express();
app.get('*', function (req, res) {
    res.send('hello');
});
app.listen(port, function () {
    console.log('server listening on:', port);
});
```

### 3. 编写 `node cluster` 版本的app.js

```Javascript
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
```

### 4. 修改nginx.conf

```

#user  nobody;
worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

#pid        logs/nginx.pid;
events {
    worker_connections  1024;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

	upstream nodejsback {
	    server 127.0.0.1:3001;
        server 127.0.0.1:3002;
        server 127.0.0.1:3003;
        server 127.0.0.1:3004;
	}


    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';

    #access_log  logs/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    #keepalive_timeout  0;
    keepalive_timeout  65;

    #gzip  on;

    server {
        listen       6000;
        server_name  localhost;

        #charset koi8-r;

        #access_log  logs/host.access.log  main;

        location / {
#            root   html;
#            index  index.html index.htm;
             proxy_pass http://nodejsback/ ;
        }

        #error_page  404              /404.html;

        # redirect server error pages to the static page /50x.html
        #
        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }

        # proxy the PHP scripts to Apache listening on 127.0.0.1:80
        #
        #location ~ \.php$ {
        #    proxy_pass   http://127.0.0.1;
        #}

        # pass the PHP scripts to FastCGI server listening on 127.0.0.1:9000
        #
        #location ~ \.php$ {
        #    root           html;
        #    fastcgi_pass   127.0.0.1:9000;
        #    fastcgi_index  index.php;
        #    fastcgi_param  SCRIPT_FILENAME  /scripts$fastcgi_script_name;
        #    include        fastcgi_params;
        #}

        # deny access to .htaccess files, if Apache's document root
        # concurs with nginx's one
        #
        #location ~ /\.ht {
        #    deny  all;
        #}
    }


    # another virtual host using mix of IP-, name-, and port-based configuration
    #
    #server {
    #    listen       8000;
    #    listen       somename:8080;
    #    server_name  somename  alias  another.alias;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}


    # HTTPS server
    #
    #server {
    #    listen       443 ssl;
    #    server_name  localhost;

    #    ssl_certificate      cert.pem;
    #    ssl_certificate_key  cert.key;

    #    ssl_session_cache    shared:SSL:1m;
    #    ssl_session_timeout  5m;

    #    ssl_ciphers  HIGH:!aNULL:!MD5;
    #    ssl_prefer_server_ciphers  on;

    #    location / {
    #        root   html;
    #        index  index.html index.htm;
    #    }
    #}

}

```

### 5. 启动nginx

```Shell
nginx
```

### 6. 启动nodejs服务器

打开4个命令行窗口启动四个app-nginx.js。

```Shell
PORT=3001 node app-nginx.js
PORT=3002 node app-nginx.js
PORT=3003 node app-nginx.js
PORT=3004 node app-nginx.js
```

打开命令行窗口启动1个app-cluster.js

```Shell
PORT=8000 node app-cluster.js
```

### 7. 使用ab命令进行性能测试

第一次: 并发50，总数3000
```Shell
ab -c 50 -n 3000 http://127.0.0.1:6000
ab -c 50 -n 3000 http://127.0.0.1:8000
```

第二次: 并发100，总数3000
```Shell
ab -c 50 -n 3000 http://127.0.0.1:6000
ab -c 50 -n 3000 http://127.0.0.1:8000
```


## 实验结果

### 并发数为50

| 运行方式       | nginx load balance | node cluster  |
| ------------- | ------------------ | ------------- |
| 第一次(ms)     | 0.968              |0.865          |
| 第二次(ms)     | 0.942              |0.705          |
| 第三次(ms)     | 4.969              |0.720          |
| 第四次(ms)     | 21.669             |0.677          |
| 第五次(ms)     | 0.913              |0.680          |
| 第六次(ms)     | 0.899              |0.675          |
| 第七次(ms)     | 22.238             |0.698          |


### 并发数为100

| 运行方式       | nginx load balance | node cluster  |
| ------------- | ------------------ | ------------- |
| 第一次(ms)     | 0.864              |0.687          |
| 第二次(ms)     | 1.026              |0.649          |
| 第三次(ms)     | 15.035             |0.679         |
| 第四次(ms)     | 0.929              |0.659         |
| 第五次(ms)     | 0.882              |0.660          |
| 第六次(ms)     | 0.919              |0.803          |
| 第七次(ms)     | 0.868              |0.653          |


## 实验结论

* `node cluster` 较 `ngixn load balnace` 性能更好,耗时更少。
* `node cluster` 较 `ngixn load balnace` 稳定性更好, nginx在分发请求时出现block，而`node cluster`一直都很稳定。
* 如果服务器有多cpu，建议采用`node cluster`的方式，性能好、配置简单。


