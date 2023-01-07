# Pyright Lint

🚧 A expremental linter based on Pyright at early stage of development. Do not use it in production. 🚧

## Table of contents

- [Available Rules](#available-rules)
  - [consistentUnionTypeDeclarations](#consistentuniontypedeclarations)
  - [noExplicitAny](#noexplicitany)
  - [noMisusedAwaitable](#nomisusedawaitable)
  - [noRedundantTypeConstituents](#noredundanttypeconstituents)
  - [preferReturnSelfType](#preferreturnselftype)
  - [restrictTemplateExpressions](#restricttemplateexpressions)
- [Configuration](#configuration)
- [Development](#development)
  - [Setup](#setup)
  - [Test](#test)
  - [Lint](#lint)
  - [Build](#build)
- [Issues](#issues)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Available Rules

### consistentUnionTypeDeclarations

Require consistently using either `X | Y` or `Union[X, Y]` for union type declarations.

```python
from typing import Union
a: Union[int, float]
# ⚠️ Use `|` instead of `Typing.Union`.
```

### noExplicitAny

Disallow the `Any` type.

```python
a: Any
# ⚠️ Unexpected Any. Specify a different type.
```

### noMisusedAwaitable

Disallow Awaitable in places not designed to handle them.

```python
import asyncio
async def foo():
    pass
if foo():
    pass
# ⚠️ Expected non-Awaitable value in a boolean conditional. Did you forget to use 'await'?
```

### noRedundantTypeConstituents

Disallow members of unions that do nothing.

```python
foo: Any | int = 1
# ⚠️ 'Any' overrides all other types in this union type.
bar: int | Literal[1] = 1
# ⚠️ 'Literal[1]' is overridden by 'int' in this union type.
```

### preferReturnSelfType

Enforce that `Self` is used when only `Self` type is returned.

```python
class Foo:
    def foo(self) -> "Foo":
        return self
# ⚠️ Use `Self` type instead.
```

### restrictTemplateExpressions

Enforce template literal expressions to be of string type.

```python
class Foo:
    pass
f"{Foo()}"
# ⚠️ Invalid type "Foo" of template literal expression.
```

## Configuration

This project assumes you have configured [pyright](https://github.com/microsoft/pyright) properly.
You can configure the rules in your `pyright-lint.config.json` file.

```json
{
  "include": ["**/*.py"],
  "consistentUnionTypeDeclarations": true,
  "noExplicitAny": true,
  "noMisusedAwaitable": true,
  "noRedundantTypeConstituents": true,
  "preferReturnSelfType": true,
  "restrictTemplateExpressions": true
}
```

## Development

### Setup

```bash
npm install
```

### Test

```bash
npm run test
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

## Issues

if you have any questions or suggestions, please create an issue.

## License

MIT

## Acknowledgements

- [eslint](https://github.com/eslint/eslint)
- [pyright](https://github.com/microsoft/pyright)
- [tslint](https://github.com/palantir/tslint)
- [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint)
