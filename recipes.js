(function initCookingData(root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) root.CookingData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const assets = {
    plate: "image/food/จาน.png",
    meat: "image/food/ของสด.png",
    vegetable: "image/food/ผัก.png",
    egg: "image/food/ไข่.png",
    steamedRice: "image/food/ข้าวสวย.png",
    stickyRice: "image/food/ข้าวเหนียว.png",
    sauce: "image/food/sauce.svg"
  };

  const ingredients = {
    meat: { name: "เนื้อ", images: [assets.meat] },
    vegetable: { name: "ผัก", images: [assets.vegetable] },
    egg: { name: "ไข่", images: [assets.egg] },
    sauce: { name: "ซอส", images: [assets.sauce] },
    steamedRice: { name: "ข้าวสวย", images: [assets.steamedRice] },
    stickyRice: { name: "ข้าวเหนียว", images: [assets.stickyRice] },
    boiledMeat: { name: "เนื้อต้ม", images: [assets.meat], tool: "pot" },
    boiledSauce: { name: "ซอสต้ม", images: [assets.sauce], tool: "pot" },
    boiledMeatSauce: { name: "เนื้อต้มซอส", images: [assets.meat, assets.sauce], tool: "pot" },
    boiledEgg: { name: "ไข่ต้ม", images: [assets.egg], tool: "pot" },
    friedMeat: { name: "ผัดเนื้อ", images: [assets.meat], tool: "pan" },
    friedMeatVegetable: { name: "ผัดเนื้อและผัก", images: [assets.meat, assets.vegetable], tool: "pan" },
    friedEgg: { name: "ไข่ดาว", images: [assets.egg], tool: "pan" },
    grilledMeat: { name: "เนื้อย่าง", images: [assets.meat], tool: "grill" },
    friedRice: { name: "ข้าวผัด", images: [assets.steamedRice, assets.meat, assets.vegetable, assets.egg], tool: "pan" }
  };

  const transformations = [
    { id: "fried-rice", tool: "pan", inputs: ["steamedRice", "meat", "vegetable", "egg"], output: "friedRice" },
    { id: "boiled-meat-sauce", tool: "pot", inputs: ["meat", "sauce"], output: "boiledMeatSauce" },
    { id: "fried-meat-vegetable", tool: "pan", inputs: ["meat", "vegetable"], output: "friedMeatVegetable" },
    { id: "boiled-meat", tool: "pot", inputs: ["meat"], output: "boiledMeat" },
    { id: "boiled-sauce", tool: "pot", inputs: ["sauce"], output: "boiledSauce" },
    { id: "boiled-egg", tool: "pot", inputs: ["egg"], output: "boiledEgg" },
    { id: "fried-meat", tool: "pan", inputs: ["meat"], output: "friedMeat" },
    { id: "fried-egg", tool: "pan", inputs: ["egg"], output: "friedEgg" },
    { id: "grilled-meat", tool: "grill", inputs: ["meat"], output: "grilledMeat" }
  ];

  const menus = [
    {
      id: "chicken-rice",
      name: "ข้าวมันไก่",
      components: ["boiledMeat", "steamedRice"],
      image: "image/food/ข้าวมันไก่.png",
      steps: [{ tool: "pot", ingredients: ["meat"] }, { ingredients: ["steamedRice"] }]
    },
    {
      id: "red-pork-rice",
      name: "ข้าวหมูแดง",
      components: ["grilledMeat", "boiledSauce", "steamedRice"],
      image: "image/food/ข้าวหมูเเดง.png",
      steps: [{ tool: "grill", ingredients: ["meat"] }, { tool: "pot", ingredients: ["sauce"] }, { ingredients: ["steamedRice"] }]
    },
    {
      id: "braised-pork-rice",
      name: "ข้าวหมูตุ๋น",
      components: ["boiledMeatSauce", "boiledEgg", "steamedRice"],
      image: "image/food/หมูตุ๋น.png",
      steps: [{ tool: "pot", ingredients: ["meat", "sauce"] }, { tool: "pot", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    {
      id: "sticky-grilled-pork",
      name: "ข้าวเหนียวหมูปิ้ง",
      components: ["grilledMeat", "stickyRice"],
      image: "image/food/หมูปิ้ง.png",
      steps: [{ tool: "grill", ingredients: ["meat"] }, { ingredients: ["stickyRice"] }]
    },
    {
      id: "kaprao-pork-egg",
      name: "ข้าวกะเพราหมูสับไข่ดาว",
      components: ["friedMeatVegetable", "friedEgg", "steamedRice"],
      image: "image/food/กะเพราหมูสับไข่ดาว.png",
      steps: [{ tool: "pan", ingredients: ["meat", "vegetable"] }, { tool: "pan", ingredients: ["egg"] }, { ingredients: ["steamedRice"] }]
    },
    {
      id: "shrimp-fried-rice",
      name: "ข้าวผัดกุ้ง",
      components: ["friedRice"],
      image: "image/food/ข้าวผัดกุ้ง.png",
      steps: [{ tool: "pan", ingredients: ["steamedRice", "meat", "vegetable", "egg"] }]
    }
  ];

  function sameItems(left, right) {
    return left.length === right.length && left.every((item, index) => item === right[index]);
  }

  function countItems(items) {
    return items.reduce((counts, item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
      return counts;
    }, new Map());
  }

  function containsItems(items, requiredItems) {
    const itemCounts = countItems(items);
    return [...countItems(requiredItems)].every(([item, count]) => (itemCounts.get(item) || 0) >= count);
  }

  function sameUnorderedItems(left, right) {
    return left.length === right.length && containsItems(left, right);
  }

  function isAssemblySubset(components) {
    return menus.some((menu) => containsItems(menu.components, components));
  }

  function createPlate() {
    return { kind: "plate", components: [], dishId: null, invalid: false };
  }

  function createIngredient(ingredientId) {
    if (!ingredients[ingredientId]) return null;
    return { kind: "ingredient", ingredientId };
  }

  function findMenu(components) {
    return menus.find((menu) => sameUnorderedItems(menu.components, components)) || null;
  }

  function normalizePlate(plate) {
    const next = { kind: "plate", components: [...plate.components], dishId: null, invalid: false };
    const menu = findMenu(next.components);
    next.dishId = menu?.id || null;
    next.invalid = !menu && !isAssemblySubset(next.components);
    return next;
  }

  function appendIngredient(plate, ingredientId) {
    if (!plate || plate.kind !== "plate" || plate.dishId || plate.invalid || !ingredients[ingredientId]) return null;
    return normalizePlate({ ...plate, components: [...plate.components, ingredientId] });
  }

  function findTransformation(tool, components) {
    return transformations.find((transformation) => {
      if (transformation.tool !== tool || transformation.inputs.length > components.length) return false;
      return sameItems(components.slice(-transformation.inputs.length), transformation.inputs);
    }) || null;
  }

  function findExactTransformation(tool, inputs) {
    return transformations.find((transformation) => transformation.tool === tool && sameUnorderedItems(transformation.inputs, inputs)) || null;
  }

  function canStageIngredients(tool, inputs) {
    return transformations.some((transformation) => {
      if (transformation.tool !== tool || inputs.length > transformation.inputs.length) return false;
      return containsItems(transformation.inputs, inputs);
    });
  }

  function applyTransformation(plate, transformation) {
    if (!plate || plate.kind !== "plate" || !transformation) return null;
    const prefix = plate.components.slice(0, -transformation.inputs.length);
    return normalizePlate({ ...plate, components: [...prefix, transformation.output] });
  }

  function getPlateImages(plate) {
    if (!plate || plate.kind !== "plate") return [];
    const menu = menus.find((item) => item.id === plate.dishId);
    if (menu) return [menu.image];
    if (!plate.components.length) return [assets.plate];
    return plate.components.flatMap((component) => ingredients[component]?.images || []);
  }

  function getInventoryImages(inventory) {
    if (!inventory) return [];
    if (inventory.kind === "ingredient") return ingredients[inventory.ingredientId]?.images || [];
    if (inventory.kind === "plate") return getPlateImages(inventory);
    return [];
  }

  return { assets, ingredients, transformations, menus, createPlate, createIngredient, findMenu, normalizePlate, appendIngredient, findTransformation, findExactTransformation, canStageIngredients, applyTransformation, getPlateImages, getInventoryImages };
});
