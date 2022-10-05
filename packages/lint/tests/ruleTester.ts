import {
  combinePaths,
  normalizeSlashes,
} from "@zzzen/pyright-internal/dist/common/pathUtils";
import { ParseNodeType } from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { TokenType } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";
import {
  lib,
  sitePackages,
} from "@zzzen/pyright-internal/dist/common/pathConsts";
import { ReportDescriptor, RuleContext, RuleModule } from "../rule";
import { TestFileSystem } from "@zzzen/pyright-internal/dist/tests/harness/vfs/filesystem";
import { ImportResolver } from "@zzzen/pyright-internal/dist/analyzer/importResolver";
import { ConfigOptions } from "@zzzen/pyright-internal/dist/common/configOptions";
import { PythonVersion } from "@zzzen/pyright-internal/dist/common/pythonVersion";
import { PyrightFileSystem } from "@zzzen/pyright-internal/dist/pyrightFileSystem";
import { Program } from "@zzzen/pyright-internal/dist/analyzer/program";
import { TestAccessHost } from "@zzzen/pyright-internal/dist/tests/harness/testAccessHost";
import { convertOffsetToPosition } from "@zzzen/pyright-internal/dist/common/positionUtils";
import { globbySync } from "globby";
import * as fs from "fs";
import { TextRangeCollection } from "@zzzen/pyright-internal/dist/common/textRangeCollection";
import {
  Position,
  TextRange,
} from "@zzzen/pyright-internal/dist/common/textRange";

export interface RunTests<
  TMessageIds extends string,
  TOptions extends Readonly<unknown[]>
> {
  // RuleTester.run also accepts strings for valid cases
  readonly valid: readonly (ValidTestCase<TOptions> | string)[];
  readonly invalid: readonly InvalidTestCase<TMessageIds, TOptions>[];
}

export interface ValidTestCase<TOptions extends Readonly<unknown[]>> {
  /**
   * Name for the test case.
   * @since 8.1.0
   */
  readonly name?: string;
  /**
   * Code for the test case.
   */
  readonly code: string;
  /**
   * Environments for the test case.
   */
  readonly env?: Readonly<Record<string, boolean>>;
  /**
   * The fake filename for the test case. Useful for rules that make assertion about filenames.
   */
  readonly filename?: string;
  /**
   * The additional global variables.
   */
  readonly globals?: Record<string, "readonly" | "writable" | "off" | true>;
  /**
   * Options for the test case.
   */
  readonly options?: Readonly<TOptions>;
  /**
   * Run this case exclusively for debugging in supported test frameworks.
   * @since 7.29.0
   */
  readonly only?: boolean;
}

export interface SuggestionOutput<TMessageIds extends string> {
  /**
   * Reported message ID.
   */
  readonly messageId: TMessageIds;
  /**
   * The data used to fill the message template.
   */
  readonly data?: Readonly<Record<string, unknown>>;
  /**
   * NOTE: Suggestions will be applied as a stand-alone change, without triggering multi-pass fixes.
   * Each individual error has its own suggestion, so you have to show the correct, _isolated_ output for each suggestion.
   */
  readonly output: string;

  // we disallow this because it's much better to use messageIds for reusable errors that are easily testable
  // readonly desc?: string;
}

export interface InvalidTestCase<
  TMessageIds extends string,
  TOptions extends Readonly<unknown[]>
> extends ValidTestCase<TOptions> {
  /**
   * Expected errors.
   */
  readonly errors: readonly TestCaseError<TMessageIds>[];
  /**
   * The expected code after autofixes are applied. If set to `null`, the test runner will assert that no autofix is suggested.
   */
  readonly output?: string | null;
}

export interface TestCaseError<TMessageIds extends string> {
  /**
   * The 1-based column number of the reported start location.
   */
  readonly column?: number;
  /**
   * The data used to fill the message template.
   */
  readonly data?: Readonly<Record<string, unknown>>;
  /**
   * The 1-based column number of the reported end location.
   */
  readonly endColumn?: number;
  /**
   * The 1-based line number of the reported end location.
   */
  readonly endLine?: number;
  /**
   * The 1-based line number of the reported start location.
   */
  readonly line?: number;
  /**
   * Reported message ID.
   */
  readonly messageId: TMessageIds;
  /**
   * Reported suggestions.
   */
  readonly suggestions?: readonly SuggestionOutput<TMessageIds>[] | null;
  /**
   * The type of the reported AST node.
   */
  readonly type?: ParseNodeType | TokenType;

  // we disallow this because it's much better to use messageIds for reusable errors that are easily testable
  // readonly message?: string | RegExp;
}

export function runRuleTest<
  TMessageIds extends string,
  TOptions extends Readonly<unknown[]>
>(
  name: string,
  rule: RuleModule<TMessageIds, TOptions>,
  testsReadonly: RunTests<TMessageIds, TOptions>
): void {
  describe("name", () => {
    testsReadonly.valid.forEach((validTest, i) => {
      const code = typeof validTest === "string" ? validTest : validTest.code;
      test("validTest " + "\n" + code, () => {
        let errors: Array<ReportDescriptor<TMessageIds>>;
        if (typeof validTest === "string") {
          errors = runTest(validTest, [] as any as TOptions).errors;
        } else {
          errors = runTest(
            validTest.code,
            validTest.options as TOptions
          ).errors;
        }
        expect(errors).toHaveLength(0);
      });
    });
    testsReadonly.invalid.forEach((testCase, i) => {
      test("invalidTest " + "\n" + testCase.code, () => {
        const { errors, parseResult } = runTest(
          testCase.code,
          testCase.options as TOptions
        );
        const lines = parseResult.tokenizerOutput.lines;
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.length).toBe(testCase.errors.length);
        testCase.errors.forEach((expectedError, j) => {
          const error = errors[j];
          const startPos = getStartPositionFromReport(error, lines);
          if (
            expectedError.line !== undefined &&
            expectedError.column !== undefined
          ) {
            expect(startPos.line).toBe(expectedError.line);
            expect(startPos.character).toBe(expectedError.column);
          }
          expect(error.messageId).toBe(expectedError.messageId);
          if (expectedError.data !== undefined) {
            expect(error.data).toEqual(expectedError.data);
          }
          if (expectedError.suggestions !== undefined) {
            expect(error.suggest).toEqual(expectedError.suggestions);
          }
        });
      });
    });
  });

  function runTest(validTest: string, options: TOptions) {
    const errors: Array<ReportDescriptor<TMessageIds>> = [];
    const program = createProgramWithFile(validTest);
    const parseResult = program
      .getSourceFile(TEST_FILE_PATH)
      ?.getParseResults();
    assertIsDefined(parseResult);
    const sourceFile = parseResult.parseTree;
    assertIsDefined(sourceFile);
    const context: RuleContext<TMessageIds, TOptions> = {
      id: name,
      options,
      program,
      report(descriptor) {
        errors.push(descriptor);
      },
    };
    const walker = rule.create(context);
    walker.walk(sourceFile);
    return { parseResult, errors };
  }
}

function getStartPositionFromReport(
  report: ReportDescriptor<string>,
  lines: TextRangeCollection<TextRange>
): Position {
  if ("node" in report) {
    return convertOffsetToPosition(report.node.start, lines);
  } else {
    return report.loc;
  }
}

function assertIsDefined<T>(content: T | undefined): asserts content is T {
  expect(content).toBeDefined();
}

const TEST_FILE_PATH = "/.src/test.py";
const TYPESHED_PATH = "/typeshed-fallback/";

const pyrightPath = require
  .resolve("pyright/package.json")
  .replace(/package\.json$/, "");

export function createProgramWithFile(content: string) {
  const libraryRoot = combinePaths(normalizeSlashes("/"), lib, sitePackages);

  const fallbackPath = combinePaths(pyrightPath, "dist", "typeshed-fallback");
  const typeshedFallbacks = globbySync("**/*.pyi", { cwd: fallbackPath });

  const typesheds: Record<string, string> = {};
  for (const file of typeshedFallbacks) {
    typesheds[TYPESHED_PATH + file] = fs.readFileSync(
      combinePaths(fallbackPath, file),
      "utf-8"
    );
  }

  const tfs = new TestFileSystem(false, {
    files: {
      ...typesheds,
      [TEST_FILE_PATH]: content,
    },
  });
  const pfs = new PyrightFileSystem(tfs);
  const configOptions = new ConfigOptions(normalizeSlashes("/"));
  configOptions.typeshedPath = normalizeSlashes(TYPESHED_PATH);
  configOptions.defaultPythonVersion = PythonVersion.V3_12;
  const importResolver = new ImportResolver(
    pfs,
    configOptions,
    new TestAccessHost(pfs.getModulePath(), [libraryRoot])
  );
  const program = new Program(importResolver, configOptions);
  program.setTrackedFiles([TEST_FILE_PATH]);

  while (program.analyze()) {
    // Continue to call analyze until it completes. Since we're not
    // specifying a timeout, it should complete the first time.
  }

  return program;
}
