"use strict";

var popen      = require('child_process'),
    fs         = require('fs'),
    basename   = require('path').basename,
    dirname    = require('path').dirname,
    walkdir    = require('walkdir'),
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

	function test() {
		initialize_app({id: 1, name: "myapp1", repository: "/Users/spersinger/github/mobile-template1"}, function(err, result) {
			console.log(err);
			console.log(result);
		});
	}

	return {
		initialize_app: initialize_app,
		test: test
	}
}
