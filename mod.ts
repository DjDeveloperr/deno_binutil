export enum Type {
  I8,
  U8,
  I16,
  U16,
  I32,
  U32,
  I64,
  U64,
  Bool,
  Struct,
}

export function getTypeSize(type: Type, structSize?: number) {
  switch (type) {
    case Type.I8:
    case Type.U8:
    case Type.Bool:
      return 1;

    case Type.I16:
    case Type.U16:
      return 2;

    case Type.I32:
    case Type.U32:
      return 4;

    case Type.I64:
    case Type.U64:
      return 8;

    case Type.Struct:
      return structSize!;

    default:
      throw new Error("Invalid type");
  }
}

const _fieldInitializers = Symbol("[[fieldInitializers]]");

export interface FieldInit {
  name: string;
  type: Type;
  offset?: number;
  struct?: typeof Struct;
  littleEndian?: boolean;
}

export interface Field {
  name: string;
  type: Type;
  offset: number;
  size: number;
  struct?: typeof Struct;
  littleEndian?: boolean;
}

export class Struct {
  serialize() {
    const proto = this.constructor as typeof Struct;
    const data = new Uint8Array(proto.size);
    const view = new DataView(data.buffer);
    const values = this as {
      [name: string]: any;
    };

    proto.fields.forEach((field) => {
      const value = values[field.name];
      function assertType(type: string) {
        if (typeof value !== type) {
          throw new TypeError(
            `Expected field "${field.name}" to be of type ${type} but it is ${typeof value}`,
          );
        }
      }

      switch (field.type) {
        case Type.I8:
          assertType("number");
          view.setInt8(field.offset, value);
          break;

        case Type.U8:
          assertType("number");
          view.setUint8(field.offset, value);
          break;

        case Type.I16:
          assertType("number");
          view.setInt16(field.offset, value, field.littleEndian);
          break;

        case Type.U16:
          assertType("number");
          view.setUint16(field.offset, value, field.littleEndian);
          break;

        case Type.I32:
          assertType("number");
          view.setInt32(field.offset, value, field.littleEndian);
          break;

        case Type.U32:
          assertType("number");
          view.setUint32(field.offset, value, field.littleEndian);
          break;

        case Type.I64:
          assertType("bigint");
          view.setBigInt64(field.offset, value, field.littleEndian);
          break;

        case Type.U64:
          assertType("bigint");
          view.setBigUint64(field.offset, value, field.littleEndian);
          break;

        case Type.Bool:
          assertType("boolean");
          view.setUint8(field.offset, Number(value));
          break;

        case Type.Struct:
          assertType("object");
          data.set((value as Struct).serialize(), field.offset);
          break;
      }
    });

    return data;
  }

  declare static littleEndian?: boolean;
  declare static readonly size: number;
  declare static [_fieldInitializers]: FieldInit[];
  declare static deserialize: <T extends Struct>(data: Uint8Array) => T;
  declare static readonly fields: Field[];
}

function pushInitializer(to: typeof Struct, init: FieldInit) {
  struct(to);
  to[_fieldInitializers].push(init);
}

function struct(to: typeof Struct) {
  if (typeof to[_fieldInitializers] === "object") return;

  to[_fieldInitializers] = [];

  Object.defineProperty(to, "size", {
    get: () => {
      let size = 0;
      for (const init of to[_fieldInitializers]) {
        size += getTypeSize(init.type, init.struct?.size);
      }
      return size;
    },
  });

  Object.defineProperty(to, "fields", {
    get: () => {
      if (
        to[_fieldInitializers].some((e) => e.offset !== undefined) &&
        !to[_fieldInitializers].every((e) => e.offset !== undefined)
      ) {
        throw new Error("Either define offset for all fields, or none.");
      }
      const fields: Field[] = [];
      let offset = 0;
      to[_fieldInitializers].forEach((field) => {
        const size = getTypeSize(field.type, field.struct?.size);
        fields.push({
          name: field.name,
          type: field.type,
          offset: field.offset ?? offset,
          size,
          struct: field.struct,
          littleEndian: to.littleEndian ?? field.littleEndian,
        });
        offset += size;
      });
      return fields;
    },
  });

  Object.defineProperty(to, "deserialize", {
    value: (data: Uint8Array) => {
      const size = to.size;
      if (data.byteLength !== size) {
        throw new Error(`Expected data of byte length ${size}`);
      }

      const view = new DataView(data.buffer);
      const result = Object.create(to.prototype);

      to.fields.forEach((field) => {
        let value;

        switch (field.type) {
          case Type.U8:
            value = view.getUint8(field.offset);
            break;

          case Type.I8:
            value = view.getInt8(field.offset);
            break;

          case Type.U16:
            value = view.getUint16(field.offset, field.littleEndian);
            break;

          case Type.I16:
            value = view.getInt16(field.offset, field.littleEndian);
            break;

          case Type.U32:
            value = view.getUint32(field.offset, field.littleEndian);
            break;

          case Type.I32:
            value = view.getInt32(field.offset, field.littleEndian);
            break;

          case Type.U64:
            value = view.getBigUint64(field.offset, field.littleEndian);
            break;

          case Type.I64:
            value = view.getBigInt64(field.offset, field.littleEndian);
            break;

          case Type.Bool:
            value = view.getUint8(field.offset) === 1;
            break;

          case Type.Struct:
            value = field.struct!.deserialize(
              data.subarray(field.offset, field.offset + field.size),
            );
            break;
        }

        (result as Record<string, any>)[field.name] = value;
      });

      return result;
    },
  });
}

type FieldDecorator = (target: Struct, name: string) => void;
type FieldDecoratorExt = [offset?: number, littleEndian?: boolean];

export function field(
  type: Type | keyof typeof Type,
  ...args: FieldDecoratorExt
): FieldDecorator;
export function field(
  struct: typeof Struct,
  ...args: FieldDecoratorExt
): FieldDecorator;
export function field(
  type: typeof Struct | Type | keyof typeof Type,
  ...args: FieldDecoratorExt
): FieldDecorator {
  return function (target: Struct, name: string) {
    const Class = target.constructor as typeof Struct;
    pushInitializer(Class, {
      name,
      struct: typeof type === "function" ? type : undefined,
      type: typeof type === "function"
        ? Type.Struct
        : typeof type === "string"
        ? Type[type]
        : type,
      offset: args[0],
      littleEndian: args[1],
    });
  };
}

export class MyStruct extends Struct {
  static littleEndian = true;

  @field("I32")
  field1!: number;
  @field("I32")
  field2!: number;

  constructor(data?: Partial<MyStruct>) {
    super();
    if (data) Object.assign(this, data);
  }
}
