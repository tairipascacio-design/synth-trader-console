// PM2: keeps the Droplet API and console running and restarts them on failure or reboot.
module.exports = {
  apps: [
    {
      name: "ghost-api",
      cwd: "/opt/ghost-sweep/engine",
      script: "node_modules/.bin/tsx",
      args: "src/index.ts",
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
      time: true,
      out_file: "/var/log/ghost/api.out.log",
      error_file: "/var/log/ghost/api.err.log",
    },
    {
      name: "ghost-console",
      cwd: "/opt/ghost-sweep",
      script: ".output/server/index.mjs",
      env: { PORT: "3000", HOST: "127.0.0.1", NODE_ENV: "production" },
      autorestart: true,
      time: true,
      out_file: "/var/log/ghost/console.out.log",
      error_file: "/var/log/ghost/console.err.log",
    },
  ],
};
