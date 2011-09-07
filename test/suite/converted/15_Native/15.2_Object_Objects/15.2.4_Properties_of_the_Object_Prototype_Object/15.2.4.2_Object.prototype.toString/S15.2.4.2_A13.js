// Copyright 2011 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/**
 * @id: S15.2.4.2_A13;
 * @section: 15.2.4.2;
 * @description: If the this value is null, return "[object Null]".;
 */

if (Object.prototype.toString.call(null) !== "[object Null]") {
  $ERROR('If the this value is null, return "[object Null]".');
}
