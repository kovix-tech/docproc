// Used by sequelize-cli for running migrations.
// Set DATABASE_URL before running: npx sequelize-cli db:migrate
module.exports = {
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
  },
  development: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/docproc_registry',
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
  },
};
