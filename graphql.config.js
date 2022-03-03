// graphql.config.js
module.exports = {
  projects: {
    app: {
      schema: ['packages/renderer/graphql.schema.json'],
      documents: ['**/*.graphql'],
    },
  },
};
