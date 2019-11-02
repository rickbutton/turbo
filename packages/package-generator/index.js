const Generator = require("yeoman-generator");
const path = require("path");

module.exports = class extends Generator {
    async prompting() {
        this.answers = await this.prompt([
            {
                type: "input",
                name: "name",
                message: "the new project name",
            }
        ]);
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
                this.destinationPath(path.resolve),
                this.answers,
            );
        }
    }
};
