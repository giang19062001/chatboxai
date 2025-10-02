module.exports = {
    apps: [
        {
            name: "chatboxai",
            script: "bin/www", //  npm start
            instances: 1,
            autorestart: true,
            watch: false,
            exec_mode: "fork",
            listen_timeout: 50000,
            kill_timeout: 5000,
            interpreter: "node",
            env: {
                NODE_ENV: "production",
                PORT: 3592,
            },
        },
    ],
};


// pm2 start ecosystem.config.js
