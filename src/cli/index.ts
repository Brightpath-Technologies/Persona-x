#!/usr/bin/env node

import { Command } from "commander";
import { createCommand } from "./create.js";
import { refineCommand } from "./refine.js";
import { registerFoodCommands } from "./food.js";

/**
 * Persona-x CLI
 *
 * Two primary commands:
 * - create: Generate a new persona definition file from scratch
 * - refine: Adjust an existing persona definition file incrementally
 * - validate: Check a persona file against the schema
 */

const program = new Command();

program
  .name("persona-x")
  .description(
    "Persona-x — create, validate, and manage structured AI persona files"
  )
  .version("0.1.0");

program
  .command("create")
  .description("Create a new persona definition file through guided discovery")
  .option("-o, --output <path>", "Output file path", "./persona.yaml")
  .option("--non-interactive", "Use defaults instead of prompting (for testing)")
  .action(async (options: { output: string; nonInteractive?: boolean }) => {
    await createCommand(options);
  });

program
  .command("refine")
  .description("Refine an existing persona definition file")
  .argument("<file>", "Path to the persona YAML file to refine")
  .option("-s, --section <section>", "Specific section to refine")
  .option("-o, --output <path>", "Output file path (defaults to overwriting input)")
  .action(async (file: string, options: { section?: string; output?: string }) => {
    await refineCommand(file, options);
  });

program
  .command("validate")
  .description("Validate a persona YAML file against the persona definition schema")
  .argument("<file>", "Path to the persona YAML file to validate")
  .action(async (file: string) => {
    const { loadPersonaFromFile } = await import("../runtime/loader.js");
    const result = await loadPersonaFromFile(file);

    if (result.success) {
      console.log(`Valid persona file: ${result.persona?.file.metadata.name}`);
      if (result.warnings && result.warnings.length > 0) {
        console.log("\nWarnings:");
        for (const warning of result.warnings) {
          console.log(`  - ${warning}`);
        }
      }
    } else {
      console.error("Validation failed:");
      for (const error of result.errors ?? []) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }
  });

program
  .command("panel")
  .description("Run a panel discussion with multiple personas")
  .argument("<files...>", "Paths to persona YAML files")
  .option("-t, --topic <topic>", "Discussion topic", "General review")
  .option("-r, --rounds <number>", "Number of discussion rounds", "3")
  .action(async (files: string[], options: { topic: string; rounds: string }) => {
    const { loadPersonasForPanel } = await import("../runtime/loader.js");
    const { createPanelSession, determineSpeakingOrder } = await import(
      "../runtime/panel.js"
    );

    const result = await loadPersonasForPanel(files);

    if (result.personas.length === 0) {
      console.error("No valid personas loaded.");
      for (const [path, errors] of Object.entries(result.errors)) {
        console.error(`  ${path}:`);
        for (const err of errors) {
          console.error(`    - ${err}`);
        }
      }
      process.exit(1);
    }

    console.log(
      `Loaded ${result.personas.length} persona(s): ${result.personas.map((p) => p.file.metadata.name).join(", ")}`
    );

    const session = createPanelSession({
      topic: options.topic,
      context: "Panel simulation via Persona-x CLI",
      personas: result.personas,
      max_rounds: parseInt(options.rounds, 10),
      moderation: "light",
    });

    const order = determineSpeakingOrder(result.personas);
    console.log(
      `\nSpeaking order (by intervention frequency): ${order.map((p) => p.file.metadata.name).join(" → ")}`
    );
    console.log(
      "\nPanel session initialised. In a full implementation, this would drive LLM responses for each persona."
    );
    console.log("\nSystem prompts generated for each persona:");
    for (const [id, prompt] of session.system_prompts) {
      console.log(`\n--- ${id} ---`);
      console.log(prompt.substring(0, 200) + "...");
    }
  });

registerFoodCommands(program);

program.parse();
