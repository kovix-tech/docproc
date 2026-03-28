'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenantId',
      },
      documentTypeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'documentTypeId',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fileUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'fileUrl',
      },
      filePath: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'filePath',
      },
      reviewTokenJti: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'reviewTokenJti',
      },
      aiModelUsed: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'aiModelUsed',
      },
      inputTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'inputTokens',
      },
      outputTokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'outputTokens',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'errorMessage',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('documents');
  },
};
