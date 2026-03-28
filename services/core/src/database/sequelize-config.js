// Used by sequelize-cli for running migrations.
// Set DATABASE_URL before running: npx sequelize-cli db:migrate
module.exports = {
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
  },
  development: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5434/docproc_core',
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
  },
};
