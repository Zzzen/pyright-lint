import restrictTemplateExpressions from "../../rules/restrict-template-expressions";
import { runRuleTest } from "../ruleTest";

runRuleTest("restrict-template-expressions", restrictTemplateExpressions, {
  valid: [
    `f"{1}"`,
    `f"{1.0}"`,
    `f"{1j}"`,
    `f"{True}"`,
    `f"{[]}"`,
    `f"{['']}"`,
    `f"{({'a': 1})}"`,
    `
class Foo:
    def __str__(self) -> str:
        return "foo"
f"{Foo()}"`,
    `
class Foo:
    def __format__(self) -> str:
        return "foo"
f"{Foo()}"`,
    `
class Foo:
    def __format__(self) -> str:
        return "foo"
class Bar(Foo):
    pass
f"{Bar()}"`,
    `
import typing
Foo = typing.NewType("Foo", str)
f"{Foo("")}"`,
  ],
  invalid: [
    {
      code: `f"{b'test'}"`,
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Literal[b'test']",
          },
          line: 0,
          column: 3,
        },
      ],
    },
    {
      code: `
class Foo:
    pass
f"{Foo()}"      
      `,
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Foo",
          },
          line: 3,
          column: 3,
        },
      ],
    },
    {
      code: `
class Foo:
    def __str__(self) -> str:
        return "foo"
f"{Foo}"`,
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Type[Foo]",
          },
          line: 4,
          column: 3,
        },
      ],
    },
    {
      code: `f"{1}"`,
      options: [{ allowInt: false }],
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Literal[1]",
          },
          line: 0,
          column: 3,
        },
      ],
    },
    {
      code: `f"{1.0}"`,
      options: [{ allowFloat: false }],
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "float",
          },
          line: 0,
          column: 3,
        },
      ],
    },
    {
      code: `f"{1j}"`,
      options: [{ allowComplex: false }],
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "complex",
          },
          line: 0,
          column: 3,
        },
      ],
    },
    {
      code: `f"{True}"`,
      options: [{ allowBool: false }],
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Literal[True]",
          },
          line: 0,
          column: 3,
        },
      ],
    },
    {
      code: `f"{False}"`,
      options: [{ allowBool: false }],
      errors: [
        {
          messageId: "invalidType",
          data: {
            type: "Literal[False]",
          },
          line: 0,
          column: 3,
        },
      ],
    },
  ],
});
