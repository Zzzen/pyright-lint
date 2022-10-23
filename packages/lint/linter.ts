import { Program } from "@zzzen/pyright-internal/dist/analyzer/program";
import { AnalyzerService } from "@zzzen/pyright-internal/dist/analyzer/service";
import { CommandLineOptions } from "@zzzen/pyright-internal/dist/common/commandLineOptions";
import { ConfigOptions } from "@zzzen/pyright-internal/dist/common/configOptions";
import { forEachAncestorDirectory } from "@zzzen/pyright-internal/dist/common/pathUtils";
import { createFromRealFileSystem } from "@zzzen/pyright-internal/dist/common/realFileSystem";
import { PyrightFileSystem } from "@zzzen/pyright-internal/dist/pyrightFileSystem";
import * as fs from "fs";
import * as path from "path";
import { fallbackPath } from "./tests/ruleTest";
export const configFileNames = ["pyright-lint.config.json"];
import { globbySync } from "globby";
import rules from "./rules";
import { ReportDescriptor, RuleContext } from "./rule";
import { NullConsole } from "@zzzen/pyright-internal/dist/common/console";

export const pyrightPath = require
  .resolve("pyright/package.json")
  .replace(/package\.json$/, "");

//https:github.com/microsoft/pyright/blob/aad650ec373a9894c6f13490c2950398095829c6/packages/pyright/index.js#L6
(global as any).__rootDirectory = path.join(pyrightPath, "dist");

export interface LinterOption {
  projectRoot: string;
  verbose?: boolean;
}

export enum Severity {
  Error = "error",
  Warning = "warning",
}

export type RuleOption = boolean | { options?: unknown[]; severity: Severity };

export interface Rules {
  noExplicitAny: RuleOption;
}

interface Config extends Rules {
  include: string[] | string;
  exclude?: string[] | string;
  // /**
  //  * https://eslint.org/docs/latest/user-guide/configuring/configuration-files
  //  * Glob pattern overrides have higher precedence than the regular configuration in the same config file.
  //  * Multiple overrides within the same config are applied in order.
  //  * That is, the last override block in a config file always has the highest precedence.
  //  */
  // overrides?: Array<{
  //   include?: string[];
  //   exclude?: string[];
  //   rules?: Record<string, unknown>;
  // }>;
}

export class Linter {
  option: LinterOption;
  service!: AnalyzerService;
  config!: Config;

  static createProgram() {}

  constructor(option: LinterOption) {
    this.option = option;
    this.init();
  }

  init() {
    const dir = this.option.projectRoot;
    const fileSystem = new PyrightFileSystem(createFromRealFileSystem(new NullConsole()));
    const service = new AnalyzerService(dir, fileSystem, {});
    const options = new CommandLineOptions(dir, false);
    service.setOptions(options);
    this.service = service;

    const config = this.readConfig(dir);
    if (!config) {
      throw new Error("no config found for " + dir);
    }
    this.config = config;
  }

  lintFiles() {
    const files = this.getMatchingFiles();
    if (!files.length) {
      throw new Error("no files found for " + this.option.projectRoot);
    }
    const errors: Array<ReportDescriptor<string>> = [];

    for (const file of files) {
      const program = this.service.backgroundAnalysisProgram.program;
      const ast = program.getSourceFile(file)?.getParseResults()?.parseTree;
      if (!ast) {
        console.error("file is not inclued by pyright", file);
        continue;
      }

      for (const [ruleName, rule] of Object.entries(rules)) {
        const active = this.config[ruleName as keyof Rules];

        if (active) {
          const context: RuleContext<string, any[]> = {
            id: ruleName,
            options: [],
            program,
            report(descriptor) {
              errors.push(descriptor);
            },
          };
          rule.create(context).walk(ast);
        }
      }
    }

    return errors;
  }

  readConfig(dir: string) {
    const configPath = forEachAncestorDirectory(dir, (d) => {
      for (const name of configFileNames) {
        const configPath = path.join(d, name);
        if (fs.existsSync(configPath)) {
          return configPath;
        }
      }
      return undefined;
    });
    // TODO: support `tools.pyright-lint` in pyproject.toml
    if (!configPath) {
      return undefined;
    }
    const config: Config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return config;
  }

  getMatchingFiles() {
    const { include, exclude } = this.config;
    const files = globbySync(include, {
      ...(exclude
        ? { ignore: Array.isArray(exclude) ? exclude : [exclude] }
        : {}),
      cwd: this.option.projectRoot,
    });

    return files.map((f) => path.join(this.option.projectRoot, f));
  }
}
