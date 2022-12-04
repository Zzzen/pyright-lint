import noMisusedAwaitable from "../../rules/no-misused-awaitable";
import { runRuleTest } from "../ruleTest";

runRuleTest("no-misused-awaitable", noMisusedAwaitable, {
  valid: [
    `
import asyncio

loop = asyncio.get_running_loop()
fut = loop.create_future()
1 or fut

nullable = fut if 1 + 1 > 2 else None

if nullable:
    pass

async def foo():
    if await fut:
        pass
    if await foo():
        pass
`,

    `
import asyncio

async def say_after(delay, what):
    await asyncio.sleep(delay)
    print(what)

async def main():
    task1 = asyncio.create_task(
        say_after(1, 'hello'))

    task2 = asyncio.create_task(
        say_after(2, 'world'))

    if await task1:
        pass

    if await task2:
        pass

    if await task1 or await task2:
        pass
`,
  ],
  invalid: [
    {
      code: `
import asyncio
async def foo():
    pass
if foo():
    pass
`,
      errors: [
        {
          messageId: "conditional",
          line: 4,
          column: 3,
        },
      ],
    },
    {
      code: `
import asyncio
loop = asyncio.get_running_loop()
fut = loop.create_future()
if fut:
    pass
`,
      errors: [
        {
          messageId: "conditional",
          line: 4,
          column: 3,
        },
      ],
    },
    {
      code: `
import asyncio
task1 = asyncio.create_task(
  say_after(1, 'hello'))
if task1:
    pass
      `,
      errors: [
        {
          messageId: "conditional",
          line: 4,
          column: 3,
        },
      ],
    },
    {
      code: `
async def foo():
    pass
bar = 1 if foo() else 2
`,
      errors: [
        {
          messageId: "conditional",
          line: 3,
          column: 11,
        },
      ],
    },
    {
      code: `
async def foo():
    pass
while foo():
    pass
`,
      errors: [
        {
          messageId: "conditional",
          line: 3,
          column: 6,
        },
      ],
    },
    {
      code: `
async def foo():
    pass
not foo()
`,
      errors: [
        {
          messageId: "conditional",
          line: 3,
          column: 4,
        },
      ],
    },
    {
      code: `
async def foo():
    pass
foo() or 1
if 1 or foo():
    pass
`,
      errors: [
        {
          messageId: "conditional",
          line: 3,
          column: 0,
        },
        {
          messageId: "conditional",
          line: 4,
          column: 8,
        },
      ],
    },
  ],
});
