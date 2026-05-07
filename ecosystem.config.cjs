module.exports = {
  apps: [
    {
      name: "gaohong-student-admin",
      script: ".next/standalone/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: "3001"
      }
    }
  ]
};
