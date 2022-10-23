import {
  Type,
  TypeCategory,
} from "@zzzen/pyright-internal/dist/analyzer/types";

export function everyType(type: Type, f: (t: Type) => boolean): boolean {
  if (type.category === TypeCategory.Union) {
    return type.subtypes.every(f);
  }
  return f(type);
}

export function assertNever(_t: never) {}

export function booleanFilter<T>(
  value?: T
): value is Exclude<T, false | null | undefined | "" | 0> {
  return !!value;
}
