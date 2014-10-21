DEBUG = true;

exports.db_client = 'pg';
exports.db_url = 'postgresql://localhost/apper';
exports.DEBUG = DEBUG;
exports.SQL_DEBUG = false;
exports.ADMIN_TOKEN = 'abc';
exports.ADMIN_USER_ID = 1;

exports.knex_options = {
  client: exports.db_client,
  connection: exports.db_url,
  debug: exports.SQL_DEBUG
};

exports.debug = function() {
  if (DEBUG) {
    console.log.apply(console, ["[debug]"].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

exports.info = function() {
  if (DEBUG) {
    console.log.apply(console, ["[info]"].concat(Array.prototype.slice.call(arguments, 0)));
  }
}

exports.warn = function() {
  console.log.apply(console, ["[WARN]"].concat(Array.prototype.slice.call(arguments, 0)));
}

exports.error = function() {
  console.log.apply(console, ["[ERROR]"].concat(Array.prototype.slice.call(arguments, 0)));
}