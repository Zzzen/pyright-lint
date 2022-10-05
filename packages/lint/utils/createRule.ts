import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import {
  RuleContext,
  RuleMetaData,
  RuleMetaDataDocs,
  RuleModule,
} from "../rule";
import { applyDefault } from "./applyDefault";

// we automatically add the url
export type NamedCreateRuleMetaDocs = Omit<RuleMetaDataDocs, "url">;
export type NamedCreateRuleMeta<TMessageIds extends string> = {
  docs: NamedCreateRuleMetaDocs;
} & Omit<RuleMetaData<TMessageIds>, "docs">;

export interface RuleCreateAndOptions<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TTreeWalker extends ParseTreeWalker
> {
  create: (
    context: Readonly<RuleContext<TMessageIds, TOptions>>,
    optionsWithDefault: Readonly<TOptions>
  ) => TTreeWalker;
  defaultOptions: Readonly<TOptions>;
}

export interface RuleWithMeta<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
> extends RuleCreateAndOptions<TOptions, TMessageIds, TTreeWalker> {
  meta: RuleMetaData<TMessageIds>;
}

export interface RuleWithMetaAndName<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
> extends RuleCreateAndOptions<TOptions, TMessageIds, TTreeWalker> {
  meta: NamedCreateRuleMeta<TMessageIds>;
  name: string;
}

function urlCreator(_name: string) {
    return 'https://google.com';
}

export function createNamedRule<
  TMessageIds extends string,
  TOptions extends readonly unknown[] = [],
  // for extending base rules
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
>({
  name,
  meta,
  ...rule
}: Readonly<
  RuleWithMetaAndName<TOptions, TMessageIds, TTreeWalker>
>): RuleModule<TMessageIds, TOptions, TTreeWalker> {
  return createRule<TOptions, TMessageIds, TTreeWalker>({
    meta: {
      ...meta,
      docs: {
        ...meta.docs,
        url: urlCreator(name),
      },
    },
    ...rule,
  });
}

/**
 * Creates a well-typed TSESLint custom ESLint rule without a docs URL.
 *
 * @returns Well-typed TSESLint custom ESLint rule.
 * @remarks It is generally better to provide a docs URL function to RuleCreator.
 */
function createRule<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
  TTreeWalker extends ParseTreeWalker = ParseTreeWalker
>({
  create,
  defaultOptions,
  meta,
}: Readonly<RuleWithMeta<TOptions, TMessageIds, TTreeWalker>>): RuleModule<
  TMessageIds,
  TOptions,
  TTreeWalker
> {
  return {
    meta,
    create(context: Readonly<RuleContext<TMessageIds, TOptions>>): TTreeWalker {
      const optionsWithDefault = applyDefault(defaultOptions, context.options);
      return create(context, optionsWithDefault);
    },
  };
}
