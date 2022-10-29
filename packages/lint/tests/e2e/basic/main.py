from typing import Any
x: Any = 1
y: str = 2

z: Any = 1 # pyright-lint: ignore [noExplicitAny]
z1: Any = 1 # type: ignore [noExplicitAny]
z2: Any = 1 # pyright: ignore [noExplicitAny]
z3: Any = 1 # pyright: ignore
