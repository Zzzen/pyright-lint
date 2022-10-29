import { ParseTreeWalker } from "@zzzen/pyright-internal/dist/analyzer/parseTreeWalker";
import {
  ClassType,
  ClassTypeFlags,
  Type,
  TypeCategory,
  TypeFlags,
  TypeVarType,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import { FormatStringNode } from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { assertNever, booleanFilter, everyType } from "../utils/type";
import { createNamedRule } from "../utils/createRule";
import {
  ClassMemberLookupFlags,
  lookUpClassMember,
} from "@zzzen/pyright-internal/dist/analyzer/typeUtils";

export default createNamedRule({
  name: "restrictTemplateExpressions",
  meta: {
    type: "problem",
    docs: {
      description: "",
      recommended: "error",
      suggestion: true,
    },
    messages: {
      invalidType: 'Invalid type "{{type}}" of template literal expression.',
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInt: {
            description:
              "Whether to allow `int` typed values in template expressions.",
            type: "boolean",
          },
          allowFloat: {
            description:
              "Whether to allow `float` typed values in template expressions.",
            type: "boolean",
          },
          allowComplex: {
            description:
              "Whether to allow `complex` typed values in template expressions.",
            type: "boolean",
          },
          allowBool: {
            description:
              "Whether to allow `bool` typed values in template expressions.",
            type: "boolean",
          },
          allowAny: {
            description:
              "Whether to allow `any` typed values in template expressions.",
            type: "boolean",
          },
          allowNone: {
            description:
              "Whether to allow `None` typed values in template expressions.",
            type: "boolean",
          },
        },
      },
    ],
  },
  defaultOptions: [
    {
      allowInt: true,
      allowFloat: true,
      allowComplex: true,
      allowBool: true,
      allowDict: true,
      allowList: true,
      allowAny: true,
      allowNone: true,
    },
  ],
  create(context, [options]) {
    function isClassTypeAllow(t: ClassType) {
      if (t.flags & TypeFlags.Instantiable) {
        return false;
      }

      if (t.details.flags & ClassTypeFlags.BuiltInClass) {
        return isBuiltinClassAllow(t);
      }

      return (
        hasCustomStrMethod(t) ||
        t.details.mro.some(
          (t) => t.category === TypeCategory.Class && isBuiltinClassAllow(t)
        )
      );
    }

    function isBuiltinClassAllow(t: ClassType) {
      const allowedClassNames = [
        "str",
        options.allowInt && "int",
        options.allowFloat && "float",
        options.allowComplex && "complex",
        options.allowBool && "bool",
        options.allowDict && "dict",
        options.allowList && "list",
      ].filter(booleanFilter);
      // TODO: what about bytes/...?
      return ClassType.isBuiltIn(t, allowedClassNames);
    }

    function hasCustomStrMethod(t: ClassType) {
      return !!(
        lookUpClassMember(
          t,
          "__str__",
          ClassMemberLookupFlags.SkipObjectBaseClass
        ) ||
        lookUpClassMember(
          t,
          "__format__",
          ClassMemberLookupFlags.SkipObjectBaseClass
        )
      );
    }

    function isTypeVarTypeAllowed(t: TypeVarType): boolean {
      if (!t.details.constraints.length) {
        return false;
      }

      return t.details.constraints.every(isTypeAllowed);
    }

    function isTypeAllowed(t: Type): boolean {
      switch (t.category) {
        case TypeCategory.Unbound:
        case TypeCategory.Unknown:
        case TypeCategory.Never:
        case TypeCategory.Function:
        case TypeCategory.OverloadedFunction:
        case TypeCategory.Module:
          return false;
        case TypeCategory.Class:
          return isClassTypeAllow(t);
        case TypeCategory.Union:
          return everyType(t, isTypeAllowed);
        case TypeCategory.Any:
          return options.allowAny;
        case TypeCategory.None:
          return options.allowNone;
        case TypeCategory.TypeVar:
          return isTypeVarTypeAllowed(t);
        default:
          assertNever(t);
      }

      return true;
    }

    return new (class Walker extends ParseTreeWalker {
      override visitFormatString(node: FormatStringNode): boolean {
        for (const expr of node.expressions) {
          const type =
            context.program.evaluator?.getTypeOfExpression(expr)?.type;
          if (!type) {
            continue;
          }
          if (!everyType(type, isTypeAllowed)) {
            context.report({
              node: expr,
              messageId: "invalidType",
              data: {
                type: context.program.printType(type, false),
              },
            });
          }
        }
        return true;
      }
    })();
  },
});
