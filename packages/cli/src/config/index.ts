import { Command } from "commander";
import fs from "fs";

const fetchCommand = new Command("fetch");

fetchCommand
    .description("Fetch config and store it.")
    .option("-u, --url <url>", "The url to fetch the config from. Defaults to the CONFIG_URL environment variable.")
    .option("-f, --file <file>", "The file to store the config in.", "module.config.json")
    .action(async (options) => {
        const res = await fetch(options.url || process.env.CONFIG_URL, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await res.json();

        fs.writeFileSync(options.file || "module.config.json", JSON.stringify(data, null, 2));
    });

const configCommand = new Command("config")
    .name("config")
    .description("Manage the config of the firewatch module.")
    .addCommand(fetchCommand);

export { configCommand };
