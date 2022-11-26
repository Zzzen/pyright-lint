import {
  convertOffsetToPosition,
  convertPositionToOffset,
} from "@zzzen/pyright-internal/dist/common/positionUtils";
import {
  Position,
  TextRange,
} from "@zzzen/pyright-internal/dist/common/textRange";
import { TextRangeCollection } from "@zzzen/pyright-internal/dist/common/textRangeCollection";
import { ParseNode, ParseNodeType } from "@zzzen/pyright-internal/dist/parser/parseNodes";
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
  message: string;
  range: TextRange;
}

export function formatErrorDescriptor(
  descriptor: ReportDescriptor<string>,
  lines: TextRangeCollection<TextRange>,
  rule: RuleModule<string, any, any>
): ErrorMessage {
  let range: TextRange;
  if ("node" in descriptor) {
    range = TextRange.create(descriptor.node.start, descriptor.node.length);
  } else {
    range = TextRange.create(
      convertPositionToOffset(descriptor.loc, lines)!,
      0
    );
  }

  return {
    message: interpolate(rule.meta.messages[descriptor.messageId], descriptor.data),
    range,
  }
}

export function isPep604Union(node: ParseNode | undefined): boolean {
  return (
    node?.nodeType === ParseNodeType.BinaryOperation &&
    node.operator === OperatorType.BitwiseOr
  );
}