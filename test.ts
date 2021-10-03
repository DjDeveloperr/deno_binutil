import { field, Struct } from "./mod.ts";
import { assertEquals } from "https://deno.land/std@0.109.0/testing/asserts.ts";

Deno.test("Struct", () => {
  class NestedLayout extends Struct {
    @field("I32")
    i32!: number;

    @field("U32")
    u32!: number;

    constructor(data?: Partial<NestedLayout>) {
      super();
      if (data) Object.assign(this, data);
    }
  }

  class Layout extends Struct {
    @field("U8")
    u8!: number;

    @field("I8")
    i8!: number;

    @field("U16")
    u16!: number;

    @field("I16")
    i16!: number;

    @field("U32")
    u32!: number;

    @field("I32")
    i32!: number;

    @field("U64")
    u64!: bigint;

    @field("I64")
    i64!: bigint;

    @field(NestedLayout)
    nested!: NestedLayout;

    @field("Bool")
    bool!: boolean;

    constructor(data?: Partial<Layout>) {
      super();
      if (data) Object.assign(this, data);
    }
  }

  const obj = new Layout({
    u8: 0xFF,
    i8: 0xFF / 2,
    u16: 0xFFFF,
    i16: 0xFFFF / 2,
    u32: 0xFFFFFFFF,
    i32: 0xFFFFFFFF / 2,
    u64: 0xFFFFFFFFFFFFFFFFn,
    i64: 0xFFFFFFFFFFFFFFFFn / 2n,
    bool: true,
    nested: new NestedLayout({
      i32: 6,
      u32: 9,
    }),
  });

  assertEquals(
    obj.serialize(),
    // deno-fmt-ignore
    new Uint8Array([
      255, 127, 255, 255, 127, 255, 255, 255, 255,
      255, 127, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 127, 255, 255, 255, 255,
      255, 255, 255,   0,   0,   0,   6,   0,   0,
        0,   9,   1
    ]),
  );
});
