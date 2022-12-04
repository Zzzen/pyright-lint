import preferReturnSelfType from "../../rules/prefer-return-self-type";
import { runRuleTest } from "../ruleTest";

runRuleTest("prefer-return-self-type", preferReturnSelfType, {
  valid: [
    `
class Foo:
    def foo(self):
        return self
    `,
    `
from typing import Self
class Foo:
    def foo(self) -> Self:
        return self
    `,
    `
from typing import Self
class Foo:
    def foo(self, other: Foo) -> "Foo":
        return other
    `,
  ],
  invalid: [
    {
      code: `
class Foo:
    def foo(self) -> "Foo":
        return self
            `,
      errors: [
        {
          line: 2,
          column: 21,
          messageId: "useSelfType",
        },
      ],
    },
    {
        code: `
class Foo:
    def foo(self) -> None | "Foo":
        if 1 + 1 == 2:
            return self
        return None
        `,
        errors: [{
            line: 2,
            column: 28,
            messageId: "useSelfType",
        }]
    },
    {
        code: `
from typing import Union
class Foo:
    def foo(self) -> Union[None, "Foo"]:
        if 1 + 1 == 2:
            return self
        return None
        `,
        errors: [{
            line: 3,
            column: 33,
            messageId: "useSelfType",
        }]
    }
  ],
});
