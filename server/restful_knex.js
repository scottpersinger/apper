var express = require('express');

module.exports = function(knex) {
  function getopts(req) {
    var opts = {select: '*', limit: 50, where: null, order: null};
      if (req.query.select) {
        opts.select = req.query.select;
        delete req.query['select'];
      }
      if (req.query.limit) {
        opts.limit = parseInt(req.query.limit);
        delete req.query['limit'];
      }
      if (req.query.order) {
        opts.order = req.query.order;
        delete req.query['order'];
      }
      opts.where = req.query;
      return opts;
  }

  return function(table, options) {
    options = options || {};

    var router = express.Router();
    router.get('/' + table, function(req, res, next) {
      var opts = getopts(req);

      var q = knex(table).select(opts.select).where(opts.where);
      if (opts.order) {
        opts.order.forEach(function(ordering) {
          q = q.orderBy(ordering);
        });
      }
      q.limit(opts.limit).then(function(rows) {
        res.json(rows);
      }).catch(function(err) {
        console.log(err);
        res.status(500).json(err);
      });
    });

    router.get('/' + table + "/:pkid", function(req, res, next) {
      var pkid = req.params.pkid;
      var opts = getopts(req);

      knex(table).select(opts.select).where({id: pkid}).limit(1).then(function(rows) {
        if (rows.length > 0) {
          res.json(rows[0]);
        } else {
          res.status(404).send("Not found");
        }
      });
    });

    function save_item(item, res) {
      if (item.id) {
        knex(table).where({id: item.id}).update(item).then(function() {
          res.send('OK');
        }).catch(function(err) {
          console.log(err);
          res.status(500).json(err);
        });
      } else {
        knex(table).insert(item, 'id').then(function(id_arr) {
          item.id = id_arr[0];
          if (options.after_create) {
            options.after_create(item, function(err, result) {
              if (err) {
                res.status(500).send(err);
              } else {
                res.json(item);
              }
            });
          } else {
            res.json(item);
          }
        }).catch(function(err) {
          console.log(err);
          res.status(500).json(err);
        })
      }
    }

    router.post('/' + table, function(req, res, next) {
      if (options.before_save) {
        options.before_save(req, res, function(item) {
          save_item(item, res);
        });
      } else {
        save_item(req.body, res);
      }
    });

    router.delete('/' + table + '/:pkid', function(req, res, next) {
      var pkid = req.params.pkid;
      knex(table).where({id: pkid}).del().then(function() {
        res.send('OK');
      }).catch(function(err) {
        res.status(500).json(err);
      });
    })

    return router;
  }
}