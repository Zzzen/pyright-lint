#!/usr/bin/env node
import commandLineArgs from "command-line-args";
import { OptionDefinition } from "command-line-args";

import { Linter } from "./linter";
import { printErrorMessage } from "./utils/ast";

import * as path from "path";

enum ExitStatus {
  NoErrors = 0,
  ErrorsReported = 1,
  FatalError = 2,
  ConfigFileParseError = 3,
  ParameterError = 4,
}

const toolName = "pyright-lint";

main();

async function main() {
  // if (process.env.NODE_ENV === 'production') {
  //     require('source-map-support').install();
  // }

  const exitCode = await processArgs();
  process.exitCode = exitCode;
  // Don't call process.exit; stdout may not have been flushed which can break readers.
  // https://github.com/nodejs/node/issues/6379
  // https://github.com/nodejs/node/issues/6456
  // https://github.com/nodejs/node/issues/19218
}

async function processArgs(): Promise<ExitStatus> {
  const optionDefinitions: OptionDefinition[] = [
    { name: "project", type: String, defaultOption: true },
    { name: "help", alias: "h", type: Boolean },
    { name: "version", type: Boolean },
    { name: "verbose", alias: "v", type: Boolean },
  ];
  let args: any;
  try {
    args = commandLineArgs(optionDefinitions);
  } catch (e: any) {
    const argErr: { name: string; optionName: string } = e;
    if (argErr && argErr.optionName) {
      console.error(
        `Unexpected option ${argErr.optionName}.\n${toolName} --help for usage`
      );
      return ExitStatus.ParameterError;
    }

    console.error(`Unexpected error\n${toolName} --help for usage`);
    return ExitStatus.ParameterError;
  }

  if (args.help !== undefined) {
    printUsage();
    return ExitStatus.NoErrors;
  }

  if (args.version !== undefined) {
    printVersion();
    return ExitStatus.NoErrors;
  }

  for (const [arg, value] of Object.entries(args)) {
    if (value === null) {
      console.error(`'${arg}' option requires a value`);
      return ExitStatus.ParameterError;
    }
  }

  const linter = new Linter({
    projectRoot: path.resolve(process.cwd(), args.project),
    verbose: args.verbose,
  });
  linter.forceAnalysis();
  const errors = linter.lintFiles();

  if (!errors.length) {
    return ExitStatus.NoErrors;
  } else {
    errors.forEach((error) => {
      const str = printErrorMessage(error);
      console.log(
        `${error.filename}:${error.range.start.line + 1}:${
          error.range.start.character + 1
        }`
      );
      console.log(str);
    });
    return ExitStatus.ErrorsReported;
  }
}

function printUsage() {
  console.log(`Usage: ${toolName} --project <dir>`);
}

function getVersionString() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const version = require("../package.json").version;
  return version.toString();
}

function printVersion() {
  console.log(`${toolName} ${getVersionString()}`);
}
