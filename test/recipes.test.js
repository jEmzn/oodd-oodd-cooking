const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../recipes.js");

test("all six menu component sequences resolve to a menu", () => {
  data.menus.forEach((menu) => {
    const plate = { kind: "plate", components: menu.components, dishId: null, invalid: false };
    assert.equal(data.normalizePlate(plate).dishId, menu.id);
  });
});

test("multi-ingredient station recipes accept any deposit order", () => {
  assert.equal(data.findExactTransformation("pot", ["sauce", "meat"]).id, "boiled-meat-sauce");
  assert.equal(data.findExactTransformation("pan", ["vegetable", "meat"]).id, "fried-meat-vegetable");
  assert.equal(data.canStageIngredients("pot", ["meat"]), true);
  assert.equal(data.canStageIngredients("pot", ["sauce", "meat"]), true);
  assert.equal(data.canStageIngredients("pan", ["vegetable"]), true);
  assert.equal(data.canStageIngredients("pot", ["meat", "egg"]), false);
});

test("fried rice consumes all four components in one pan operation", () => {
  const transformation = data.findExactTransformation("pan", ["egg", "vegetable", "meat", "steamedRice"]);
  assert.equal(transformation.id, "fried-rice");
  const plate = data.appendIngredient(data.createPlate(), transformation.output);
  assert.equal(plate.dishId, "shrimp-fried-rice");
});

test("raw ingredients can be held without a plate", () => {
  assert.deepEqual(data.createIngredient("meat"), { kind: "ingredient", ingredientId: "meat" });
  assert.deepEqual(data.getInventoryImages(data.createIngredient("egg")), data.ingredients.egg.images);
});

test("wrong order becomes invalid and cannot be appended", () => {
  const plate = data.normalizePlate({ kind: "plate", components: ["steamedRice", "egg"], dishId: null, invalid: false });
  assert.equal(plate.invalid, true);
  assert.equal(data.appendIngredient(plate, "meat"), null);
});

test("plate assembly remains order-sensitive", () => {
  const plate = data.normalizePlate({ kind: "plate", components: ["boiledMeat", "steamedRice"], dishId: null, invalid: false });
  assert.equal(plate.dishId, null);
  assert.equal(plate.invalid, true);
});
