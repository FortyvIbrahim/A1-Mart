module.exports = {
  apps: [{
    script: "server.js",
    env: {
      NODE_ENV: "production",
      // Set to "true" to add [Sample] demo data automatically on start/deploy
      // (idempotent: skipped when sample data already exists).
      SEED_SAMPLE_DATA: process.env.SEED_SAMPLE_DATA || "false",
    },
  },],

  deploy: {
    production: {
      user: 'SSH_USERNAME',
      host: 'SSH_HOSTMACHINE',
      ref: 'origin/master',
      repo: 'GIT_REPOSITORY',
      path: 'DESTINATION_PATH',
      'pre-deploy-local': '',
      "post-deploy":
        "npm install && npm run db:setup && pm2 reload ecosystem.config.js --env production",
      'pre-setup': ''
    }
  }
};
