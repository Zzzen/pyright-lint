import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ClassType,
  ClassTypeFlags,
  TypeCategory,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import {
  BinaryOperationNode,
  ExpressionNode,
  IfNode,
  ParseNodeType,
  TernaryNode,
  UnaryOperationNode,
  WhileNode,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { OperatorType } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";
import { createNamedRule } from "../utils/createRule";

export default createNamedRule({
  name: "noMisusedAwaitable",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow Awaitable in places not designed to handle them",
      recommended: "error",
      suggestion: true,
    },
    messages: {
      conditional:
        "Expected non-Awaitable value in a boolean conditional. Did you forget to use 'await'?",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const checkedNodes = new Set<ExpressionNode>();

    function checkTestConditional(node: ExpressionNode) {
      checkConditional(node, true);
    }

    function checkConditional(node: ExpressionNode, isTestExpr = false) {
      if (checkedNodes.has(node)) {
        return;
      }
      checkedNodes.add(node);

      if (node.nodeType === ParseNodeType.BinaryOperation) {
        checkConditional(node.leftExpression, isTestExpr);
        if (isTestExpr) {
          checkConditional(node.rightExpression, isTestExpr);
        }
        return;
      }

      const type = context.program.evaluator?.getTypeOfExpression(node)?.type;
      if (
        type?.category === TypeCategory.Class &&
        type.details.flags & ClassTypeFlags.BuiltInClass &&
        (ClassType.isBuiltIn(type, "Coroutine") ||
          ClassType.isBuiltIn(type, "Task") ||
          ClassType.isBuiltIn(type, "Future"))
      ) {
        context.report({
          node: node,
          messageId: "conditional",
        });
      }
    }

    return new (class Walker extends ParseTreeWalker {
      override visitIf(node: IfNode): boolean {
        checkTestConditional(node.testExpression);
        return true;
      }

      override visitTernary(node: TernaryNode): boolean {
        checkTestConditional(node.testExpression);
        return true;
      }

      override visitWhile(node: WhileNode): boolean {
        checkTestConditional(node.testExpression);
        return true;
      }

      override visitUnaryOperation(node: UnaryOperationNode): boolean {
        if (node.operator === OperatorType.Not) {
          checkTestConditional(node.expression);
        }
        return true;
      }

      override visitBinaryOperation(node: BinaryOperationNode): boolean {
        if (
          node.operator === OperatorType.And ||
          node.operator === OperatorType.Or
        ) {
          checkConditional(node);
        }
        return true;
      }
    })();
  },
});
