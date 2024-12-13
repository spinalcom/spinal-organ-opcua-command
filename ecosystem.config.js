module.exports = {
    apps: [
        {
            name: "spinal-organ-opcua-command",
            script: "index.js",
            cwd: "./dist",
            error_file: "./logs/err.log",
            out_file: "./logs/out.log",
            log_file: "./logs/combined.log",
            time: true,
            max_memory_restart: "3G",
            node_args: "--max-old-space-size=4096",
        },
    ],
};
