var http           = require('http'),
    config         = require('./server/config'),
    express        = require('express'),
    bodyParser     = require('body-parser'),
    methodOverride = require('method-override'),
    path           = require('path'),
    knex           = require('knex')(config.knex_options),
    restful        = require('./server/restful_knex')(knex),
    actions        = require('./server/actions')(knex)
    ;

console.log("Connecting to ", config.knex_options);

/********************* APP SETUP *****************************/

app = express();
server = http.createServer(app);

logger = {
  debug: config.debug,
  warn: config.warn,
  error: config.error
};


app.use(bodyParser());
app.use(methodOverride());

app.use(express.static(path.join(__dirname, 'client/')));

// Logging
app.use(function(req, res, next) {
  logger.debug("[ROOT] ", req.method, req.url);
  next();
});

app.use(function(err, req, res, next) {
  logger.error(err.stack);
  res.status(500).send(err.message);
});

/********************* ROUTES *****************************/


app.post('/resource/apps/:app_id/run', actions.run_app);
app.use('/resource/', restful('apps', {after_create: actions.initialize_app}));
app.use('/resource/', restful('files'));

/********************* SERVER STARTT *****************************/

app.set('port', process.env.PORT || 5000);

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
