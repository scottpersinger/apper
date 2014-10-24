"use strict";

var popen      = require('child_process'),
    fs         = require('fs'),
    basename   = require('path').basename,
    dirname    = require('path').dirname,
    walkdir    = require('walkdir'),
    httpProxy  = require('http-proxy'),
    async      = require('async'),
    Promise    = require("knex/node_modules/bluebird"),
    app_target = '_app_source'
    ;

module.exports = function(knex) {
	function initialize_app(app, callback) {
		console.log("Git cloning app ", app);

    var appDir = "app" + app.id;
		if (fs.existsSync(app_target + "/" + appDir)) {
			return callback("Error, app with that name already exists");
		}

		if (!fs.existsSync(app_target)) {
			fs.mkdirSync(app_target);
		}

		popen.exec("git clone " + app.repository + " " + appDir, {cwd: app_target}, function(err, stdout, stdin) {
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
    var app_root = app_target + "/" + "app" + app_id;

    return new Promise(function(resolver, rejecter) {
      return knex('files').select('*').where({app_id: app_id})
      .then(function(rows) {
        async.eachSeries(rows, function(row) {
          fs.mkdirs(app_root + "/" + row.path, function(err) {
            if (!err) {
              throw err;
            } else {
              fs.open(app_root + "/" + row.path + row.name, "w", function(err, fd) {
                if (err) {throw err};
                fs.write(fd, row.content, "utf8", function() {
                  fs.close(fd);
                });
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
      appProxy.web(req, res, function(e) {
        res.status(500).send(String(e));
      });
    });
    app.use(router);

    console.log("Forking child server for app" + child_app_id);
    return child_process.fork("./server.js", [], {cwd: "_app_source/app" + child_app_id, env: {PORT: 9999}});
  }

	function test() {
	}

  function run_app(req, res, next) {
    var app_id = req.params.app_id;
    var app_dir = app_target + "/" + "app" + app_id;

    unpack_app_files(app_id).then(function() {
      run_child_server(req.app, app_id);
    }).catch(next);
  }

	return {
		initialize_app: initialize_app,
    run_child_server: run_child_server,
    run_app: run_app,
		test: test
	}
}
