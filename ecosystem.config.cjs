module.exports = {
  apps: [
    {
      name: "serverApi",
      script: "./index.js",
      watch: true,
      ignore_watch: [
        "node_modules",
        "users.json",
        ".env",
        "logs",
        "public",    
      ],
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};