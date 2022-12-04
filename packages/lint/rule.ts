import type { JSONSchema4 } from "./utils/json-schema";
import type { Program } from "@zzzen/pyright-internal/dist/analyzer/program";
import type { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import type {
  Position,
  Range,
} from "@zzzen/pyright-internal/dist/common/textRange";
import type { ParseNode } from "@zzzen/pyright-internal/dist/parser/parseNodes";
import type { Token } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";

export type RuleRecommendation = "error" | "strict" | "warn" | false;

export interface RuleMetaDataDocs {
  /**
   * Concise description of the rule
   */
  description: string;
  /**
   * The recommendation level for the rule.
   * Used by the build tools to generate the recommended and strict configs.
   * Set to false to not include it as a recommendation
   */
  recommended: "error" | "strict" | "warn" | false;
  /**
   * The URL of the rule's docs
   */
  url?: string;
  /**
   * Specifies whether the rule can return suggestions.
   */
  suggestion?: boolean;
}
export interface RuleMetaData<TMessageIds extends string> {
  /**
   * True if the rule is deprecated, false otherwise
   */
  deprecated?: boolean;
  /**
   * Documentation for the rule, unnecessary for custom rules/plugins
   */
  docs?: RuleMetaDataDocs;
  /**
   * The fixer category. Omit if there is no fixer
   */
  fixable?: "code" | "whitespace";
  /**
   * Specifies whether rules can return suggestions. Omit if there is no suggestions
   */
  hasSuggestions?: boolean;
  /**
   * A map of messages which the rule can report.
   * The key is the messageId, and the string is the parameterised error string.
   * See: https://eslint.org/docs/developer-guide/working-with-rules#messageids
   */
  messages: Record<TMessageIds, string>;
  /**
   * The type of rule.
   * - `"problem"` means the rule is identifying code that either will cause an error or may cause a confusing behavior. Developers should consider this a high priority to resolve.
   * - `"suggestion"` means the rule is identifying something that could be done in a better way but no errors will occur if the code isn’t changed.
   * - `"layout"` means the rule cares primarily about whitespace, semicolons, commas, and parentheses, all the parts of the program that determine how the code looks rather than how it executes. These rules work on parts of the code that aren’t specified in the AST.
   */
  type: "suggestion" | "problem" | "layout";
  /**
   * The name of the rule this rule was replaced by, if it was deprecated.
   */
  replacedBy?: readonly string[];
  /**
   * The options schema. Supply an empty array if there are no options.
   */
  schema: JSONSchema4 | readonly JSONSchema4[];
}

export interface RuleFix {
  range: Readonly<Range>;
  text: string;
}

export interface RuleFixer {
  insertTextAfter(nodeOrToken: ParseNode | Token, text: string): RuleFix;

  insertTextAfterRange(range: Readonly<Range>, text: string): RuleFix;

  insertTextBefore(nodeOrToken: ParseNode | Token, text: string): RuleFix;

  insertTextBeforeRange(range: Readonly<Range>, text: string): RuleFix;

  remove(nodeOrToken: ParseNode | Token): RuleFix;

  removeRange(range: Readonly<Range>): RuleFix;

  replaceText(nodeOrToken: ParseNode | Token, text: string): RuleFix;

  replaceTextRange(range: Readonly<Range>, text: string): RuleFix;
}

export interface SuggestionReportDescriptor<TMessageIds extends string>
  extends Omit<ReportDescriptorBase<TMessageIds>, "fix"> {
  readonly fix: ReportFixFunction;
}

export type ReportFixFunction = (
  fixer: RuleFixer
) => null | RuleFix | readonly RuleFix[] | IterableIterator<RuleFix>;
export type ReportSuggestionArray<TMessageIds extends string> =
  SuggestionReportDescriptor<TMessageIds>[];

export interface ReportDescriptorBase<TMessageIds extends string> {
  /**
   * The parameters for the message string associated with `messageId`.
   */
  readonly data?: Readonly<Record<string, unknown>>;
  /**
   * The fixer function.
   */
  readonly fix?: ReportFixFunction | null;
  /**
   * The messageId which is being reported.
   */
  readonly messageId: TMessageIds;

  // we disallow this because it's much better to use messageIds for reusable errors that are easily testable
  // readonly desc?: string;
}
export interface ReportDescriptorWithSuggestion<TMessageIds extends string>
  extends ReportDescriptorBase<TMessageIds> {
  /**
   * 6.7's Suggestions API
   */
  readonly suggest?: Readonly<ReportSuggestionArray<TMessageIds>> | null;
}

export interface ReportDescriptorNodeOptionalLoc {
  /**
   * The Node or AST Token which the report is being attached to
   */
  readonly node: ParseNode | Token;
  /**
   * An override of the location of the report
   */
  readonly loc?: Readonly<Position>;
}
export interface ReportDescriptorLocOnly {
  /**
   * An override of the location of the report
   */
  loc: Readonly<Position>;
}
export type ReportDescriptor<TMessageIds extends string> =
  ReportDescriptorWithSuggestion<TMessageIds> &
    (ReportDescriptorNodeOptionalLoc | ReportDescriptorLocOnly);

/**
 * Plugins can add their settings using declaration
 * merging against this interface.
 */
export interface SharedConfigurationSettings {
  [name: string]: unknown;
}

export interface RuleContext<
  TMessageIds extends string,
  TOptions extends readonly unknown[]
> {
  /**
   * The rule ID.
   */
  id: string;
  /**
   * An array of the configured options for this rule.
   * This array does not include the rule severity.
   */
  options: TOptions;
  /**
   * An object containing parser-provided services for rules
   */
  program: Program;
  /**
   * The shared settings from configuration.
   * We do not have any shared settings in this plugin.
   */
  // settings: SharedConfigurationSettings;

  /**
   * Returns the current working directory passed to Linter.
   * It is a path to a directory that should be considered as the current working directory.
   */
  // getCwd?(): string;

  /**
   * Returns the filename associated with the source.
   */
  // getFilename(): string;

  /**
   * Returns the full path of the file on disk without any code block information (unlike `getFilename()`).
   */
  // getPhysicalFilename?(): string;

  /**
   * Reports a problem in the code.
   */
  report(descriptor: ReportDescriptor<TMessageIds>): void;
}

export interface RuleModule<
  TMessageIds extends string,
  TOptions extends readonly unknown[] = [],
  // for extending base rules
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
> {
  /**
   * Metadata about the rule
   */
  meta: RuleMetaData<TMessageIds>;

  /**
   * Function which returns an object with methods that pyright-lint calls to “visit”
   * nodes while traversing the abstract syntax tree.
   */
  create(context: Readonly<RuleContext<TMessageIds, TOptions>>): TTreeWalker;
}

export type RuleCreateFunction<
  TMessageIds extends string = never,
  TOptions extends readonly unknown[] = unknown[],
  // for extending base rules
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
> = (context: Readonly<RuleContext<TMessageIds, TOptions>>) => TTreeWalker;
