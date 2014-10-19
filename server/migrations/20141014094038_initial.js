'use strict';

exports.up = function(knex, Promise) {
  var schema = knex.schema;

  return Promise.all([
    schema.hasTable('tokens').then(function(exists) {
      if (!exists) {
        console.log("Creating tokens table");
        return schema.createTable('tokens', function(table) {
          table.increments('id');
          table.string('token').notNullable().unique().index();
          table.string('heroku_user_id').notNullable();
          table.boolean('is_admin').defaultTo(false);
          table.timestamps();
        });
      } else {
        return schema;
      }
    }),

    schema.hasTable('apps').then(function(exists) {
      if (!exists) {
        console.log("Creating apps table");
        return schema.createTable('apps', function(table) {
          table.increments('id');
          table.string('heroku_user_id').notNullable().index();
          table.string('name').notNullable();
          table.timestamps();
        });
      } else {
        return schema;
      }
    }),

    schema.hasTable('files').then(function(exists) {
    	if (!exists) {
    		console.log("Creating files table");
        return schema.createTable('files', function(table) {
          table.increments('id');
          table.integer('app_id').notNullable();
          table.string('name').notNullable();
          table.string('path').notNullable().index();
          table.text('content');
          table.string('content_type');
        });
    	} else {
        return schema;
      }
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable('files'),
    knex.schema.dropTable('apps'),
    knex.schema.dropTable('tokens')
  ]);
  
};
