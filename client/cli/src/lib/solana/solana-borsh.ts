import { serialize, BinaryReader, Schema, BorshError } from 'borsh';

// Class wrapping a plain object
export abstract class Assignable {
  // eslint-disable-next-line
  constructor(properties: { [key: string]: any }) {
    Object.keys(properties).forEach((key: string) => {
      this[key] = properties[key];
    });
  }

  encode(): Buffer {
    return Buffer.from(serialize(SCHEMA, this));
  }

  static decode<T extends Assignable>(data: Buffer): T {
    return deserializeExtraBytes(SCHEMA, this, data);
  }
}

// Class representing a Rust-compatible enum, since enums are only strings or
// numbers in pure JS
export abstract class Enum extends Assignable {
  enum: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(properties: Record<string, any>) {
    super(properties);
    if (Object.keys(properties).length !== 1) {
      throw new Error('Enum can only take single value');
    }
    this.enum = '';
    Object.keys(properties).forEach((key) => {
      this.enum = key;
    });
  }
}

export const SCHEMA: Schema = new Map();

// TODO PR for leaving extra bytes, a lot of code copied from
// https://github.com/near/borsh-js/blob/master/borsh-ts/index.ts

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function deserializeField(
  schema: Schema,
  fieldName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldType: any,
  reader: BinaryReader
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  try {
    if (typeof fieldType === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-implicit-any
      return reader[`read${capitalizeFirstLetter(fieldType)}`]();
    }

    if (fieldType instanceof Array) {
      if (typeof fieldType[0] === 'number') {
        return reader.readFixedArray(fieldType[0]);
      }

      return reader.readArray(() =>
        deserializeField(schema, fieldName, fieldType[0], reader)
      );
    }

    return deserializeStruct(schema, fieldType, reader);
  } catch (error) {
    if (error instanceof BorshError) {
      error.addToFieldPath(fieldName);
    }
    throw error;
  }
}

function deserializeStruct<T>(
  schema: Schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classType: any,
  reader: BinaryReader
): T {
  const structSchema = schema.get(classType);
  if (!structSchema) {
    throw new BorshError(`Class ${classType.name} is missing in schema`);
  }

  if (structSchema.kind === 'struct') {
    const result = {};
    for (const [fieldName, fieldType] of schema.get(classType).fields) {
      result[fieldName] = deserializeField(
        schema,
        fieldName,
        fieldType,
        reader
      );
    }
    return new classType(result);
  }

  if (structSchema.kind === 'enum') {
    const idx = reader.readU8();
    if (idx >= structSchema.values.length) {
      throw new BorshError(`Enum index: ${idx} is out of range`);
    }
    const [fieldName, fieldType] = structSchema.values[idx];
    const fieldValue = deserializeField(schema, fieldName, fieldType, reader);
    return new classType({ [fieldName]: fieldValue });
  }

  throw new BorshError(
    `Unexpected schema kind: ${structSchema.kind} for ${classType.constructor.name}`
  );
}

/// Deserializes object from bytes using schema.
export function deserializeExtraBytes<T extends Assignable>(
  schema: Schema,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  classType: any,
  buffer: Buffer
): T {
  const reader = new BinaryReader(buffer);
  return deserializeStruct(schema, classType, reader);
}
