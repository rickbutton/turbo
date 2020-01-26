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
                        component: "code",
                    },
                    {
                        type: "component",
                        component: "repl",
                    },
                ],
            },
            {
                name: "new",
                panes: [
                    {
                        type: "component",
                        component: "breakpoints",
                    },
                    {
                        type: "component",
                        component: "stack",
                    },
                ],
            },
            {
                name: "logs",
                panes: [
                    {
                        type: "component",
                        component: "log",
                    },
                    {
                        type: "component",
                        component: "debug",
                    },
                ],
            },
        ],
    },
};
