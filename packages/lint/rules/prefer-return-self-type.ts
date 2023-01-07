import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ClassNode,
  ParseNodeType,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { createNamedRule } from "../utils/createRule";
import * as AnalyzerNodeInfo from "@zzzen/pyright-internal/dist/analyzer/analyzerNodeInfo";
import { FunctionDeclaration } from "@zzzen/pyright-internal/dist/analyzer/declaration";
import {
  ClassType,
  TypeCategory,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import { findTypeNode } from "../utils/ast";

export default createNamedRule({
  name: "preferReturnSelfType",
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce that `Self` is used when only `Self` type is returned.",
      recommended: "strict",
    },
    messages: {
      useSelfType: "Use `Self` type instead.",
    },
    schema: [],
    fixable: "code",
  },
  defaultOptions: [],
  create(context) {
    function checkClass(node: ClassNode) {
      let classType: ClassType | undefined;
      for (const statement of node.suite.statements) {
        if (
          statement.nodeType !== ParseNodeType.Function ||
          !statement.returnTypeAnnotation
        ) {
          continue;
        }

        const returnsClassName = findTypeNode(
          statement.returnTypeAnnotation,
          context.program.evaluator,
          (subNode) =>
            subNode.nodeType === ParseNodeType.StringList &&
            subNode.strings.length === 1 &&
            subNode.strings[0].value === node.name.value
        );

        if (!returnsClassName) {
          return;
        }

        const decl = AnalyzerNodeInfo.getDeclaration(statement) as
          | FunctionDeclaration
          | undefined;
        if (!decl) {
          continue;
        }
        if (isFunctionReturningSelf(decl)) {
          context.report({
            node: returnsClassName,
            messageId: "useSelfType",
          });
        }
      }

      function isFunctionReturningSelf(decl: FunctionDeclaration) {
        let hasReturnSelf = false;
        let hasReturnClassType = false;

        decl.returnStatements?.forEach((returnStatement) => {
          if (!returnStatement.returnExpression) {
            return;
          }

          if (
            returnStatement.returnExpression.nodeType === ParseNodeType.Name &&
            returnStatement.returnExpression.value === "self"
          ) {
            hasReturnSelf = true;
          }

          const returnType = context.program.evaluator?.getTypeOfExpression(
            returnStatement.returnExpression
          ).type;
          if (!returnType) {
            return;
          }

          if (
            returnType.category === TypeCategory.TypeVar &&
            returnType.details.isSynthesizedSelf
          ) {
            hasReturnSelf = true;
            return;
          }

          const type = getClassType();
          if (
            type &&
            returnType.category === TypeCategory.Class &&
            ClassType.isSameGenericClass(returnType, type)
          ) {
            hasReturnClassType = true;
            return;
          }
        });

        return hasReturnSelf && !hasReturnClassType;
      }

      function getClassType() {
        return (classType ??=
          context.program.evaluator?.getTypeOfClass(node)?.classType);
      }
    }

    return new (class Walker extends ParseTreeWalker {
      visitClass(node: ClassNode): boolean {
        checkClass(node);
        return true;
      }
    })();
  },
});
