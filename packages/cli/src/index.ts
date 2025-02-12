import { Command } from "commander";
import { configCommand } from "./config";

export const cli = new Command().addCommand(configCommand);

cli.name("firewatch").description("Firewatch CLI").version("1.0.0");
