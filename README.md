# deno_binutil

Utility to work with binary related data in Deno.

```ts
class Point extends Struct {
  static littleEndian = true;

  @field("U32")
  x!: number;

  @field("U32")
  y!: number;

  constructor(data?: Partial<Point>) {
    super();
    if (data) Object.assign(this, data);
  }
}

const point = new Point({ x: 50, y: 40 });
console.log(point.serialize());
// Uint8Array(8) [
//   50, 0, 0, 0,
//   40, 0, 0, 0
// ]
```

Copyright 2021 @ DjDeveloperr
