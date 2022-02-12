// graphql.config.js
module.exports = {
  projects: {
    app: {
      schema: ['src/graphql.schema.json'],
      documents: ['**/*.graphql'],
    },
  },
};
