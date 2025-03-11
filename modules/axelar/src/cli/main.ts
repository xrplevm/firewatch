import { cli } from "@firewatch/cli";

require("dotenv").config();

(() => {
    // Main execution logic goes here
    cli.parse(process.argv);
})();
