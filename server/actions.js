"use strict";

var fs             = require('fs-extra'),
    config         = require('./config'),
    basename       = require('path').basename,
    dirname        = require('path').dirname,
    walkdir        = require('walkdir'),
    httpProxy      = require('http-proxy'),
    async          = require('async'),
    express        = require('express'),
    child_process  = require('child_process'),
    Promise        = require("knex/node_modules/bluebird")
    ;

var app_target     = '_app_source',
    child_servers  = {};

module.exports = function(knex) {
	function clone_app(app, callback) {
		console.log("Git cloning app ", app);

    var appDir = "app" + app.id;
		if (fs.existsSync(app_target + "/" + appDir)) {
			return callback("Error, app with that name already exists");
		}

		if (!fs.existsSync(app_target)) {
			fs.mkdirSync(app_target);
		}

		child_process.exec("git clone " + app.repository + " " + appDir, {cwd: app_target}, function(err, stdout, stdin) {
			if (err) {
				callback(err);
			} else {
				console.log(stdout);
				load_files(app, appDir);
				callback(null, stdout);
			}
		});
	}

	function load_files(app, appDir) {
		var root = app_target + "/" + appDir + "/";
		walkdir(root, function(path, stats) {
			if (stats.isFile()) {
				var rel_path = path.substring(path.indexOf(root) + root.length);
				if (rel_path[0] != '.') {
					fs.readFile(path, function(err, data) {
						if (!err) {
              rel_path = dirname(rel_path);
              if (rel_path === '.') {
                rel_path = "";
              }
							console.log("Inserting path ", rel_path, " with name ", basename(path));
							knex('files').insert({app_id: app.id, name: basename(path), 
													path: rel_path,
													content: data}).catch(function(err) {
														console.log(err);
													});
						}
					})
				}
			}
		});
	}

  function unpack_app_files(app_id) {
    console.log("Unpacking files");
    var app_root = app_target + "/" + "app" + app_id;

    return new Promise(function(resolver, rejecter) {
      console.log("Inside promise, calling knex");
      return knex('files').select('*').where({app_id: app_id})
      .then(function(rows) {
        async.eachSeries(rows, function(row, continuation) {
          fs.mkdirs(app_root + "/" + row.path, function(err) {
            if (err) {
              console.log("Error! ", err);
              throw err;
            } else {
              console.log("Writing file ", row.name);
              var subpath = row.path ? (row.path + "/") : "";
              fs.writeFile(app_root + "/" + subpath + row.name, row.content, function(err) {
                if (err) {
                  console.log("Error writing file ", err);
                }
                continuation();
              });
            }
          });
        }, function() {
          resolver(app_id);
        });

      }).catch(function(err) {
        rejecter(err);
      });
    });
  }

  function run_child_server(app, child_app_id) {
    var router = express.Router();
    var appProxy = httpProxy.createProxyServer({
        target:'http://localhost:9999'
    });

    router.use('/app' + child_app_id, function (req, res) {
      console.log("Proxy request: ", req.url);
      appProxy.web(req, res, function(e) {
        res.status(500).send(String(e));
      });
    });
    app.use(router);

    console.log("Forking child server for app" + child_app_id);
    var env = {
      PORT: 9999,
      DATABASE_URL: config.db_url
    };

    function startChildServer() {
      child_servers[child_app_id] = 
        child_process.fork("./server.js", [], {cwd: "_app_source/app" + child_app_id, env: env});
    }

    if (child_servers[child_app_id]) {
      child_servers[child_app_id].on('exit', startChildServer);
      child_servers[child_app_id].kill();
    } else {
      startChildServer();
    }

  }

	function test() {
	}

  function run_app(req, res, next) {
    var app_id = req.params.app_id;
    var app_dir = app_target + "/" + "app" + app_id;

    unpack_app_files(app_id).then(function() {
      run_child_server(req.app, app_id);
      res.send('OK');
    }).catch(next);
  }

	return {
		initialize_app: clone_app,
    run_child_server: run_child_server,
    run_app: run_app,
		test: test
	}
}
