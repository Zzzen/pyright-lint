import { RuleModule } from "../../rule";
import noExplicitAny from "../../rules/no-explicit-any";
import { runRuleTest } from "../ruleTest";

runRuleTest("no-explicit-any", noExplicitAny, {
  valid: [
    `
x: Foo = 1;
`,
  ],
  invalid: [
    {
      code: `
from typing import Any
x: Any = 1;
`,
      errors: [
        {
          messageId: "unexpectedAny",
          line: 2,
          column: 3,
        },
      ],
    }
  ]
});
