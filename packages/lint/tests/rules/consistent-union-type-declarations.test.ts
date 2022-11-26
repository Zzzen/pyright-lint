import consistentUnionTypeDeclarations from "../../rules/consistent-union-type-declarations";
import { runRuleTest } from "../ruleTest";

runRuleTest(
  "consistent-union-type-declarations",
  consistentUnionTypeDeclarations,
  {
    valid: [
      `a: int | float`,
      `a: int | float | complex`,
      `a: UnknownGeneric[int, float]`,
      `
def foo(a: int | float) -> int | float:
    return a
        `,
      {
        code: `a: int | float`,
        options: ["union"],
      },
      {
        code: `
from typing import Union
a: Union[int, float]
`,
        options: ["generic"],
      },
    ],
    invalid: [
      {
        code: `
from typing import Union
a: Union[int, float]
        `,
        errors: [
          {
            messageId: "preferUnion",
            line: 2,
            column: 3,
          },
        ],
      },
      {
        code: `a: int | float`,
        options: ["generic"],
        errors: [
          {
            messageId: "preferGeneric",
            line: 0,
            column: 3,
          },
        ],
      },
      {
        code: `a: int | float | complex`,
        options: ["generic"],
        errors: [
          {
            messageId: "preferGeneric",
            line: 0,
            column: 3,
          },
        ],
      },
    ],
  }
);
