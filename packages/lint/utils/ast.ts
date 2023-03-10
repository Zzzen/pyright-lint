import { codeFrameColumns } from "@babel/code-frame";
import { TypeEvaluator } from "@zzzen/pyright-internal/dist/analyzer/typeEvaluatorTypes";
import {
  ClassType,
  TypeCategory,
} from "@zzzen/pyright-internal/dist/analyzer/types";
import {
  convertOffsetToPosition,
  convertPositionToOffset,
} from "@zzzen/pyright-internal/dist/common/positionUtils";
import {
  Position,
  positionsAreEqual,
  Range,
  TextRange,
} from "@zzzen/pyright-internal/dist/common/textRange";
import { TextRangeCollection } from "@zzzen/pyright-internal/dist/common/textRangeCollection";
import {
  BinaryOperationNode,
  ExpressionNode,
  ParseNode,
  ParseNodeType,
} from "@zzzen/pyright-internal/dist/parser/parseNodes";
import { OperatorType } from "@zzzen/pyright-internal/dist/parser/tokenizerTypes";
import { ReportDescriptor, RuleModule } from "../rule";
import { interpolate } from "./interpolate";

export function getStartPositionFromReport(
  report: ReportDescriptor<string>,
  lines: TextRangeCollection<TextRange>
): Position {
  if ("node" in report) {
    return convertOffsetToPosition(report.node.start, lines);
  } else {
    return report.loc;
  }
}

export interface ErrorMessage {
  filename: string;
  fileContent: string;
  message: string;
  textRange: TextRange;
  range: Range;
}

export function formatErrorDescriptor(
  filename: string,
  fileContent: string,
  descriptor: ReportDescriptor<string>,
  lines: TextRangeCollection<TextRange>,
  rule: RuleModule<string, any, any>
): ErrorMessage {
  let textRange: TextRange;
  let range: Range;
  if ("node" in descriptor) {
    textRange = TextRange.create(descriptor.node.start, descriptor.node.length);
    range = {
      start: convertOffsetToPosition(descriptor.node.start, lines),
      end: convertOffsetToPosition(
        descriptor.node.start + descriptor.node.length,
        lines
      ),
    };
  } else {
    textRange = TextRange.create(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      convertPositionToOffset(descriptor.loc, lines)!,
      0
    );
    range = {
      start: descriptor.loc,
      end: descriptor.loc,
    };
  }

  return {
    filename,
    fileContent,
    message: interpolate(
      rule.meta.messages[descriptor.messageId],
      descriptor.data
    ),
    textRange: textRange,
    range,
  };
}

export function printErrorMessage(error: ErrorMessage) {
  return codeFrameColumns(
    error.fileContent,
    {
      start: toBabelPosition(error.range.start),
      end: positionsAreEqual(error.range.start, error.range.end)
        ? undefined
        : toBabelPosition(error.range.end),
    },
    {
      message: error.message,
    }
  );
}

export function toBabelPosition(pos: Position) {
  return {
    line: pos.line + 1,
    column: pos.character + 1,
  };
}

export function isPep604Union(
  node: ParseNode | undefined
): node is BinaryOperationNode {
  return (
    node?.nodeType === ParseNodeType.BinaryOperation &&
    node.operator === OperatorType.BitwiseOr
  );
}

export function findTypeNode(
  container: ExpressionNode,
  evaluator: TypeEvaluator | undefined,
  cb: (node: ParseNode) => boolean
): ParseNode | undefined {
  if (isPep604Union(container)) {
    const left = findTypeNode(container.leftExpression, evaluator, cb);
    if (left) {
      return left;
    }
    return findTypeNode(container.rightExpression, evaluator, cb);
  }
  const baseType =
    container.nodeType === ParseNodeType.Index &&
    evaluator?.getTypeOfExpression(container.baseExpression).type;
  const isUnion =
    baseType &&
    baseType.category === TypeCategory.Class &&
    ClassType.isBuiltIn(baseType, "Union");
  if (isUnion) {
    return container.items.map((node) => node.valueExpression).find(cb);
  }
  return cb(container) ? container : undefined;
}
