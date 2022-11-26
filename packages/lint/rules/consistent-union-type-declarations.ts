import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ClassType,
  TypeCategory,
  TypeFlags,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import {
  BinaryOperationNode,
  IndexNode,
  TypeAnnotationNode,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { OperatorType } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";
import { isPep604Union } from "../utils/ast";
import { createNamedRule } from "../utils/createRule";

export default createNamedRule({
  name: "consistentUnionTypeDeclarations",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require consistently using either `X | Y` or `Union[X, Y]` for union type declarations.",
      recommended: "warn",
      suggestion: true,
    },
    fixable: "code",
    hasSuggestions: true,
    messages: {
      preferGeneric: "Use `Typing.Union` instead of `|`.",
      preferUnion: "Use `|` instead of `Typing.Union`.",
    },
    schema: [
      {
        type: "object",
        properties: {
          default: {
            enum: ["union", "generic"],
          },
        },
      },
    ],
  },
  defaultOptions: ["union"],
  create(context, [opt]) {
    class GenericWalker extends ParseTreeWalker {
      override visitBinaryOperation(node: BinaryOperationNode): boolean {
        if (node.operator !== OperatorType.BitwiseOr) {
          return true;
        }
        if (isPep604Union(node.parent)) {
          return true;
        }
        context.report({
          node,
          messageId: "preferGeneric",
        });
        return true;
      }
    }

    class UnionWalker extends ParseTreeWalker {
      override visitIndex(node: IndexNode): boolean {
        const type = context.program.evaluator?.getTypeOfExpression(
          node.baseExpression
        );
        if (
          type?.type.category !== TypeCategory.Class ||
          !(type.type.flags & TypeFlags.Instantiable) ||
          !ClassType.isBuiltIn(type.type, "Union")
        ) {
          return true;
        }
        context.report({
          node,
          messageId: "preferUnion",
        });
        return true;
      }
    }

    const typeAnnotationWalker =
      opt === "union" ? new UnionWalker() : new GenericWalker();

    return new (class Walker extends ParseTreeWalker {
      override visitTypeAnnotation(node: TypeAnnotationNode): boolean {
        typeAnnotationWalker.walk(node.typeAnnotation);
        return false;
      }
    })();
  },
});
