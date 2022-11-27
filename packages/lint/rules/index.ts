import noExplicitAny from "./no-explicit-any";
import noMisusedAwaitable from "./no-misused-awaitable";
import restrictTemplateExpressions from "./restrict-template-expressions";
import consistentUnionTypeDeclarations from "./consistent-union-type-declarations";
import noRedundantTypeConstituents from "./no-redundant-type-constituents";
import { RuleModule } from "../rule";
import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";

const rules: Record<string, RuleModule<string, any, ParseTreeWalker>> = {
  noExplicitAny,
  noMisusedAwaitable,
  restrictTemplateExpressions,
  consistentUnionTypeDeclarations,
  noRedundantTypeConstituents,
};

export default rules;
