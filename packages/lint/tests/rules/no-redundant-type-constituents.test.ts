import noRedundantTypeConstituents from "../../rules/no-redundant-type-constituents";
import { runRuleTest } from "../ruleTest";

runRuleTest("no-redundant-type-constituents", noRedundantTypeConstituents, {
  valid: [
    `
from typing import Union, Literal
x0: Union[int, str, bool, bytes] = 1
x1: Union[int, str, bool, bytes] = 1
x2: Union[str, Literal[1]] = 1
x3 = int | 1
  `,
  ],
  invalid: [
    {
      code: `
from typing import Union, Literal, Any
x0: Union[int, Literal[1]] = 1
x1: Union[Literal[1], int] = 1
x2: Literal[1] | int = 1
x3: int | Literal[1] = 1
x4: Any | int = 1
x5: int | str | Literal[1] = 1
        `,
      errors: [
        {
          line: 2,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "1",
            primitive: "int",
          },
        },
        {
          line: 3,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "1",
            primitive: "int",
          },
        },
        {
          line: 4,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "1",
            primitive: "int",
          },
        },
        {
          line: 5,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "1",
            primitive: "int",
          },
        },
        {
          line: 6,
          column: 4,
          messageId: "overrides",
          data: {
            typeName: "Any",
          },
        },
        {
          line: 7,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "1",
            primitive: "int",
          },
        },
      ],
    },
    {
      code: `
from typing import Union, Literal
x0: str | Literal["1"]
x1: Literal["1"] | str
x2: Union[str, Literal["1"]]
x3: Union[Literal["1"], str]
        `,
      errors: [
        {
          line: 2,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "'1'",
            primitive: "str",
          },
        },
        {
          line: 3,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "'1'",
            primitive: "str",
          },
        },
        {
          line: 4,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "'1'",
            primitive: "str",
          },
        },
        {
          line: 5,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "'1'",
            primitive: "str",
          },
        },
      ],
    },
    {
      code: `
from typing import Literal
x0: bool | Literal[True]
x1: Literal[False] | bool
          `,
      errors: [
        {
          line: 2,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "True",
            primitive: "bool",
          },
        },
        {
          line: 3,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "False",
            primitive: "bool",
          },
        },
      ],
    },
    {
      code: `
from typing import Literal
x0: bytes | Literal[b"hello"]
x1: Literal[b"world"] | bytes
          `,
      errors: [
        {
          line: 2,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "b'hello'",
            primitive: "bytes",
          },
        },
        {
          line: 3,
          column: 4,
          messageId: "literalOverridden",
          data: {
            literal: "b'world'",
            primitive: "bytes",
          },
        },
      ],
    },
  ],
});
