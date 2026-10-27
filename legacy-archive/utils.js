function isValidTodoText(text) {
  return typeof text === "string" && text.trim().length > 0;
}

module.exports = { isValidTodoText };
