const test = require("node:test");
const assert = require("node:assert/strict");
const data = require("../recipes.js");

test("all six menu component sequences resolve to a menu", () => {
  data.menus.forEach((menu) => {
    const plate = { kind: "plate", components: menu.components, dishId: null, invalid: false };
    assert.equal(data.normalizePlate(plate).dishId, menu.id);
  });
});

test("plate menu components and steps keep cooked food before rice", () => {
  const expected = {
    "chicken-rice": {
      components: ["boiledMeat", "steamedRice"],
      steps: [{ tool: "pot", ingredients: ["meat"] }, { ingredients: ["steamedRice"] }]
    },
    "red-pork-rice": {
      components: ["grilledMeat", "boiledSauce", "steamedRice"],
      steps: [{ tool: "grill", ingredients: ["meat"] }, { tool: "pot", ingredients: ["sauce"] }, { ingredients: ["steamedRice"] }]
    },
    "braised-pork-rice": {
      components: ["boiledMeatSauce", "boiledEgg", "steamedRice"],
      steps: [{ tool: "pot", ingredients: ["meat", "sauce"] }, { tool: "pot", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    "sticky-grilled-pork": {
      components: ["grilledMeat", "stickyRice"],
      steps: [{ tool: "grill", ingredients: ["meat"] }, { ingredients: ["stickyRice"] }]
    },
    "kaprao-pork-egg": {
      components: ["friedMeatVegetable", "friedEgg", "steamedRice"],
      steps: [{ tool: "pan", ingredients: ["meat", "vegetable"] }, { tool: "pan", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    "shrimp-fried-rice": {
      components: ["friedRice"],
      steps: [{ tool: "pan", ingredients: ["steamedRice", "meat", "vegetable", "egg"] }]
    }
  };

  data.menus.forEach((menu) => assert.deepEqual({ components: menu.components, steps: menu.steps }, expected[menu.id], menu.id));
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

test("rice before a cooked component is invalid", () => {
  const emptyPlate = data.createPlate();
  const plate = data.appendIngredient(emptyPlate, "steamedRice");
  assert.equal(plate.invalid, true);
  assert.equal(data.appendIngredient(plate, "meat"), null);
  assert.deepEqual(emptyPlate, data.createPlate(), "rejecting rice does not mutate the original plate");
});

test("five plate menus assemble when rice is added last", () => {
  const plateMenus = data.menus.filter((menu) => menu.id !== "shrimp-fried-rice");
  plateMenus.forEach((menu) => {
    let plate = data.createPlate();
    menu.components.forEach((component) => {
      plate = data.appendIngredient(plate, component);
      assert.equal(plate.invalid, false, `${menu.id}: ${component} is a valid next component`);
    });
    assert.equal(plate.dishId, menu.id);
  });
});

test("the original chicken order is now valid", () => {
  let plate = data.createPlate();
  plate = data.appendIngredient(plate, "boiledMeat");
  plate = data.appendIngredient(plate, "steamedRice");
  assert.equal(plate.dishId, "chicken-rice");
});
