import type { Iterable, Error, IterableObject } from './types';
import { calculatePrecision } from './utils';

/**
 * @param {number|Array} received
 * @param {number|Array} expected
 * @param {number} precision
 * @param {boolean} strict equality or subsets allowed
 * @return {boolean|{reason, expected, received}}
 */
export function recursiveCheck(
  received: Iterable,
  expected: Iterable,
  precision: number,
  strict = true,
): false | Error {
  if (typeof received === 'number' && typeof expected === 'number') {
    // Received and expected are numbers

    if (isNaN(received)) {
      return isNaN(expected)
        ? false
        : {
            reason: 'Expected',
            expected,
            received,
          };
    } else if (!isFinite(received)) {
      return received === expected
        ? false
        : {
            reason: 'Expected',
            expected,
            received,
          };
    } else if (Math.abs(received - expected) <= calculatePrecision(precision)) {
      return false;
    } else {
      return {
        reason: 'Expected',
        expected,
        received,
        diff: Math.abs(received - expected),
      };
    }
  } else if (
    (typeof received === 'string' && typeof expected === 'string') ||
    (typeof received === 'boolean' && typeof expected === 'boolean')
  ) {
    // The received types are not numbers, but they have the same type

    if (received === expected) {
      return false;
    } else {
      return {
        reason: `The ${typeof expected}s do not match`,
        expected,
        received,
      };
    }
  } else if (isArray(received) && isArray(expected)) {
    // Received and expected are arrays
    const receivedLength = (received as ArrayType).length;
    const expectedLength = (expected as ArrayType).length;
    if (receivedLength !== expectedLength) {
      return {
        reason: 'The arrays length does not match',
        expected: expectedLength,
        received: receivedLength,
      };
    }
    for (let i = 0; i < receivedLength; i++) {
      const error = recursiveCheck(
        (received as ArrayType)[i],
        (expected as ArrayType)[i],
        precision,
        strict,
      );
      if (error) {
        return { ...error, index: i };
      }
    }
    return false;
  } else if (expected === undefined && received === undefined) {
    /* Received and expected are either
     * 1) both explicitly set as undefined
     * 2) undefined properties of an object, where the received value may be implicitly undefined
     */

    return false;
  } else if (expected === null && received === null) {
    // Received and expected are null

    return false;
  } else if (
    expected !== null &&
    typeof expected === 'object' &&
    !Array.isArray(received) &&
    received !== null &&
    typeof received === 'object' &&
    !Array.isArray(expected)
  ) {
    // Received and expected are objects

    const sorter = (a: string, b: string) => a.localeCompare(b);
    const receivedKeys = Object.keys(received).sort(sorter);
    const expectedKeys = Object.keys(expected).sort(sorter);
    const sameLength = !strict || receivedKeys.length === expectedKeys.length;
    if (
      !sameLength ||
      expectedKeys.some(
        (e) => !Object.prototype.hasOwnProperty.call(received, e),
      )
    ) {
      return {
        reason: 'The objects do not have similar keys',
        expected: expectedKeys,
        received: receivedKeys,
      };
    }
    for (const prop in expected) {
      const propError = recursiveCheck(
        (received as IterableObject)[prop],
        (expected as IterableObject)[prop],
        precision,
        strict,
      );
      if (propError) {
        return { ...propError, key: prop };
      }
    }
    return false;
  } else {
    // Error for all other types
    return {
      reason: 'The current data type is not supported or they do not match',
      expected: typeof expected,
      received: typeof received,
    };
  }
}

type ArrayType = Float32Array | Float64Array | Array<Iterable>;
function isArray(value: Iterable): boolean {
  return (
    Array.isArray(value) ||
    value instanceof Float32Array ||
    value instanceof Float64Array
  );
}
