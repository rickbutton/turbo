const node = require("@turbo/connector-node").node;

module.exports = {
    target: node({ script: "test.js", name: "test.js test" }),
    layout: {
        windows: [
            {
                name: "debug",
                panes: [
                    {
                        type: "component",
                        component: "repl",
                    },
                ],
            },
            {
                name: "sh",
                panes: [
                    {
                        type: "shell",
                    },
                ],
            },
        ],
    },
};
