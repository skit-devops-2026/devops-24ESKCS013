const assert = require("assert");
const { isValidTodoText } = require("./utils");

assert.strictEqual(isValidTodoText("Buy milk"), true);
assert.strictEqual(isValidTodoText(""), false);
assert.strictEqual(isValidTodoText("   "), false);
assert.strictEqual(isValidTodoText(123), false);

console.log("All tests passed.");
