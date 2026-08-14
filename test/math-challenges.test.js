const test = require("node:test");
const assert = require("node:assert/strict");
const mathChallenges = require("../math-challenges.js");

function sequenceRandom(values) {
  let index = 0;
  return () => values[index++ % values.length];
}

test("a round contains two single-question sets with addition and subtraction", () => {
  const sets = mathChallenges.createRound(sequenceRandom([0, 0.999, 0.1, 0.7, 0.3, 0.8, 0.2]));
  assert.equal(sets.length, 2);
  assert.deepEqual(sets.map((set) => set.questions.length), [1, 1]);
  assert.deepEqual(sets.flatMap((set) => set.questions).map((question) => question.operator).sort(), [...mathChallenges.operators].sort());
});

test("challenge trigger times stay inside their round windows", () => {
  assert.deepEqual(mathChallenges.createSchedule(() => 0), [1, 181]);
  assert.deepEqual(mathChallenges.createSchedule(() => 0.999999), [180, 360]);
});

test("addition and subtraction stay between zero and one hundred", () => {
  for (let seed = 0; seed <= 100; seed += 1) {
    const random = () => seed / 101;
    ["add", "subtract"].forEach((operator) => {
      const question = mathChallenges.createQuestion(operator, random);
      assert.ok(question.left >= 0 && question.left <= 100);
      assert.ok(question.right >= 0 && question.right <= 100);
      assert.ok(question.answer >= 0 && question.answer <= 100);
      assert.equal(question.operator === "add" ? question.left + question.right : question.left - question.right, question.answer);
    });
  }
});

test("multiplication and division are not exposed or accepted", () => {
  assert.deepEqual(mathChallenges.operators, ["add", "subtract"]);
  assert.throws(() => mathChallenges.createQuestion("multiply"), TypeError);
  assert.throws(() => mathChallenges.createQuestion("divide"), TypeError);
});

test("an injected random function produces deterministic rounds", () => {
  const values = [0.25, 0.75, 0.1, 0.4, 0.9, 0.2, 0.6, 0.3, 0.8];
  assert.deepEqual(mathChallenges.createRound(sequenceRandom(values)), mathChallenges.createRound(sequenceRandom(values)));
});
