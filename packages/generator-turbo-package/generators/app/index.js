'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const path = require("path");

module.exports = class extends Generator {
    prompting() {
        this.log(
          yosay(`Welcome to the ${chalk.red('generator-turbo-package')} generator!`)
        );

        const prompts = [
            {
                type: "input",
                name: "name",
                message: "project name",
            },
        ];

        return this.prompt(prompts).then(props => {
            // To access props later use this.props.someAnswer;
            this.props = props;

            this.destinationRoot(path.join("packages", props.name));
        });
    }

    writing() {
        const files = [
            "package.json",
            "src/index.ts",
            "src/index.spec.ts",
            "tsconfig.build.json",
            "tsconfig.json",
        ];

        for (const file of files) {
            this.fs.copyTpl(
                this.templatePath(file),
                this.destinationPath(file),
                this.props,
            );
        }
    }

    install() {
        this.log("make sure to re-bootstrap!");
    }
};
