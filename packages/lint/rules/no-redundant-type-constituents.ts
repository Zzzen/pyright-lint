import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import { printLiteralValue } from "@zzzen/pyright-internal/dist/analyzer/typePrinter";

import {
  TypeCategory,
  ClassType,
  Type,
  isClass,
  ClassTypeFlags,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import {
  BinaryOperationNode,
  IndexNode,
  ParseNode,
  TypeAnnotationNode,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { OperatorType } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";
import { isPep604Union } from "../utils/ast";
import { createNamedRule } from "../utils/createRule";
import { builtInClassTypeIs } from "../utils/type";

export default createNamedRule({
  name: "noRedundantTypeConstituents",
  meta: {
    docs: {
      description: "Disallow members of unions that do nothing.",
      recommended: false,
    },
    messages: {
      literalOverridden: `'{{literal}}' is overridden by '{{primitive}}' in this union type.`,
      overrides: `'{{typeName}}' overrides all other types in this union type.`,
    },
    schema: [],
    type: "suggestion",
  },
  defaultOptions: [],
  create(context) {
    function checkUnionType(type: Type, node: ParseNode) {
      if (type.category !== TypeCategory.Union) {
        return;
      }
      let hasInt = false;
      let intLiterals: Set<ClassType> | undefined;
      let hasBool = false;
      let boolLiterals: Set<ClassType> | undefined;
      let hasStr = false;
      let strLiterals: Set<ClassType> | undefined;
      let hasBytes = false;
      let bytesLiterals: Set<ClassType> | undefined;
      // // TODO: check enum?
      // let enums: Set<ClassType> | undefined;
      // let enumLiterals: Set<ClassType> | undefined;
      for (const subtype of type.subtypes) {
        if (subtype.category === TypeCategory.Any) {
          context.report({
            node,
            messageId: "overrides",
            data: {
              typeName: "Any",
            },
          });
          return;
        }
        if (
          subtype.category !== TypeCategory.Class ||
          !(subtype.details.flags & ClassTypeFlags.BuiltInClass)
        ) {
          continue;
        }
        if (builtInClassTypeIs(subtype, "int")) {
          if (subtype.literalValue !== undefined) {
            (intLiterals ??= new Set()).add(subtype);
          } else {
            hasInt = true;
          }
        } else if (builtInClassTypeIs(subtype, "bool")) {
          if (subtype.literalValue !== undefined) {
            (boolLiterals ??= new Set()).add(subtype);
          } else {
            hasBool = true;
          }
        } else if (builtInClassTypeIs(subtype, "str")) {
          if (subtype.literalValue !== undefined) {
            (strLiterals ??= new Set()).add(subtype);
          } else {
            hasStr = true;
          }
        } else if (builtInClassTypeIs(subtype, "bytes")) {
          if (subtype.literalValue !== undefined) {
            (bytesLiterals ??= new Set()).add(subtype);
          } else {
            hasBytes = true;
          }
        }
        if (hasInt && intLiterals) {
          context.report({
            node,
            messageId: "literalOverridden",
            data: {
              literal: printLiterals(intLiterals),
              primitive: "int",
            },
          });
          return;
        }
        if (hasBool && boolLiterals) {
          context.report({
            node,
            messageId: "literalOverridden",
            data: {
              literal: printLiterals(boolLiterals),
              primitive: "bool",
            },
          });
          return;
        }
        if (hasStr && strLiterals) {
          context.report({
            node,
            messageId: "literalOverridden",
            data: {
              literal: printLiterals(strLiterals),
              primitive: "str",
            },
          });
          return;
        }
        if (hasBytes && bytesLiterals) {
          context.report({
            node,
            messageId: "literalOverridden",
            data: {
              literal: printLiterals(bytesLiterals),
              primitive: "bytes",
            },
          });
          return;
        }
      }
    }

    function printLiterals(literals: Set<ClassType>) {
      return Array.from(literals.values())
        .map((x) => printLiteralValue(x))
        .join(" | ");
    }

    class TypeAnnotationVisitor extends ParseTreeWalker {
      override visitBinaryOperation(node: BinaryOperationNode): boolean {
        if (node.operator !== OperatorType.BitwiseOr) {
          return true;
        }
        if (isPep604Union(node.parent)) {
          return true;
        }
        const type = context.program.evaluator?.getTypeOfExpression(node);
        if (!type) {
          return true;
        }
        checkUnionType(type.type, node);
        return true;
      }
      override visitIndex(node: IndexNode): boolean {
        const baseTypeResult = context.program.evaluator?.getTypeOfExpression(
          node.baseExpression
        );
        if (
          !(
            baseTypeResult &&
            isClass(baseTypeResult.type) &&
            ClassType.isBuiltIn(baseTypeResult.type, "Union")
          )
        ) {
          return true;
        }
        const type = context.program.evaluator?.getTypeOfExpression(node);
        if (!type) {
          return true;
        }
        checkUnionType(type.type, node);
        return true;
      }
    }

    const typeAnnotationVisitor = new TypeAnnotationVisitor();

    return new (class Walker extends ParseTreeWalker {
      override visitTypeAnnotation(node: TypeAnnotationNode): boolean {
        typeAnnotationVisitor.walk(node);
        return false;
      }
    })();
  },
});
