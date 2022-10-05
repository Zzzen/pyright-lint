import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import { TypeCategory } from "@zzzen/pyright-internal/dist/analyzer/types";
import {
  ParseNodeType,
  TypeAnnotationNode,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { createNamedRule } from "../utils/createRule";

export default createNamedRule({
  name: "no-explicit-any",
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow the `any` type",
      recommended: "warn",
      suggestion: true,
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      unexpectedAny: "Unexpected any. Specify a different type.",
      suggestUnknown:
        "Use `unknown` instead, this will force you to explicitly, and safely assert the type is correct.",
      suggestNever:
        "Use `never` instead, this is useful when instantiating generic type parameters that you don't need to know the type of.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          fixToUnknown: {
            type: "boolean",
          },
          ignoreRestArgs: {
            type: "boolean",
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      fixToUnknown: false,
      ignoreRestArgs: false,
    },
  ],
  create(context) {
    context.options
    return new (class Walker extends ParseTreeWalker {
      override visitTypeAnnotation(node: TypeAnnotationNode): boolean {
        if (node.typeAnnotation.nodeType === ParseNodeType.Name) {
          if (
            node.typeAnnotation.value === "Any" &&
            context.program.evaluator?.getTypeOfAnnotation(node.typeAnnotation)
              ?.category === TypeCategory.Any
          ) {
            context.report({
                node: node.typeAnnotation,
                messageId: "unexpectedAny",
            })
          }
        }

        return true;
      }
    })();
  },
});
