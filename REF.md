# สรุปปัญหา: เกม Multiplayer กระตุก (Oodd Oodd Cooking)

## อาการ
เล่นโหมด Multiplayer กับเพื่อนแล้วตัวละครขยับกระตุก ไม่ลื่น ทั้งที่โหมด Solo ลื่นปกติ

## สิ่งที่ทดสอบไปแล้ว
| ทดสอบ | ผลลัพธ์ | สรุปได้ว่า |
|---|---|---|
| Deploy บน Render (free tier) | กระตุก | — |
| Host เองบนเครื่องตัวเอง + ngrok | ดีขึ้นนิดหน่อยเท่านั้น | ไม่ใช่ปัญหา CPU/hosting เป็นหลัก |
| เช็ค ngrok usage limit | ไม่มีทางชน limit (เล่นแค่ 2 คน) | ไม่ใช่สาเหตุ |

**ข้อสรุปจากการทดสอบ:** เพราะ host เองบนเครื่องแรงกว่า Render free tier มากแล้วยังกระตุกอยู่ ปัญหาจึงไม่ใช่เรื่อง server ประมวลผลไม่ทันหรือ hosting limit แต่เป็นเรื่อง **สถาปัตยกรรมการ sync ตำแหน่งผู้เล่นในโค้ด**

---

## สาเหตุที่แท้จริง (พบ 2 จุดหลักในโค้ด)

### สาเหตุที่ 1: ตัวเองไม่มี Client-side Prediction ⭐ (ตัวการหลัก)

**ไฟล์:** client (`renderMultiplayerState`)

```js
const me = state.players.find((item) => item.id === selfId);
if (me) { playerState.x = me.x; playerState.y = me.y; ... }
```

ตัวละครของ**ผู้เล่นเอง**ก็ถูกกำหนดตำแหน่งจาก state ที่ server ส่งมาเท่านั้น ไม่ได้ขยับทันทีตอนกดปุ่ม

**Flow ปัจจุบัน (มีดีเลย์สะสม):**
1. กดปุ่ม → ส่ง `move-input` ไป server
2. Server รอ tick รอบถัดไป (สูงสุด 50ms) → คำนวณตำแหน่งใหม่
3. Server broadcast `room-state` กลับมา (ping ไป-กลับ)
4. Client ค่อย set ตำแหน่งจริง

→ ทุกครั้งที่กดปุ่ม จะรู้สึกหน่วงเท่ากับ **ping + tick delay** เต็มๆ ซึ่งเป็นเหตุผลที่ host เองบนเครื่องแรงก็ยังกระตุก เพราะไม่เกี่ยวกับ performance เลย

### สาเหตุที่ 2: ผู้เล่นอื่นไม่มี Interpolation

**ไฟล์:** client (`renderRemotePlayers`)

```js
group.setAttribute("transform", `translate(${item.x} ${item.y})`);
```

ตำแหน่งผู้เล่นอื่นถูก set ตรงๆ ทุกครั้งที่มี `room-state` เข้ามา (ทุก 50ms จาก server) โดยไม่มีการไล่ตำแหน่งแบบ smooth ระหว่างสอง update ทำให้เห็นเป็นการ "กระโดด" เป็นสเต็ปๆ แทนที่จะเห็นการเคลื่อนไหวต่อเนื่อง

### ปัจจัยรอง: Tick rate ของ server ค่อนข้างต่ำ

**ไฟล์:** server

```js
room.movementTimer = setInterval(() => updateMovement(room), 50); // 20 tick/วินาที
```

20 tick/วินาทีค่อนข้างต่ำสำหรับเกม real-time ทำให้ interval ระหว่างการอัปเดตแต่ละครั้งกว้าง ยิ่งเสริมอาการกระตุกให้ชัดขึ้น (แต่ไม่ใช่สาเหตุหลัก — แก้ข้อ 1 และ 2 ก่อนจะเห็นผลชัดกว่ามาก)

---

## วิธีแก้ (เรียงตามผลกระทบ ควรทำตามลำดับ)

### แก้ที่ 1: เพิ่ม Client-side Prediction ให้ตัวเอง

ให้ client ขยับตัวเองทันทีเหมือนโหมด Solo (ไม่ต้องรอ server ตอบกลับ) แล้วค่อยปรับตำแหน่งเบาๆ ตาม state จริงจาก server (reconciliation) แทนการ snap ตรงๆ

```js
let selfPredicted = { x: 500, y: 350 };

function moveMultiplayer() {
  if (!gameRunning || mode !== "multiplayer") return;
  const { left, right, up, down } = multiplayerInput;
  let dx = (right ? 1 : 0) - (left ? 1 : 0);
  let dy = (down ? 1 : 0) - (up ? 1 : 0);
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    selfPredicted.x = Math.max(65, Math.min(935, selfPredicted.x + (dx / length) * playerState.speed));
    selfPredicted.y = Math.max(105, Math.min(555, selfPredicted.y + (dy / length) * playerState.speed));
    playerState.x = selfPredicted.x;
    playerState.y = selfPredicted.y;
    setPlayerPosition();
    positionCookingStatus();
    updatePrompt();
  }
  animationId = requestAnimationFrame(moveMultiplayer);
}
```

ใน `renderMultiplayerState` เปลี่ยนจาก set ตรงๆ เป็น sync ตำแหน่งจาก server เข้ากับค่า predicted แทนการ snap แรง:

```js
if (me) {
  selfPredicted.x = me.x;
  selfPredicted.y = me.y;
  inventory = me.inventory;
  updateHeldItem();
}
```

### แก้ที่ 2: เพิ่ม Interpolation ให้ผู้เล่นอื่น

แยกตำแหน่ง "เป้าหมาย" (จาก server) ออกจากตำแหน่งที่ render จริง แล้วไล่เข้าหากันทุก frame ด้วย `requestAnimationFrame`

```js
const remoteTargets = new Map();  // id -> ตำแหน่งล่าสุดจาก server
const remoteRendered = new Map(); // id -> ตำแหน่งที่ render จริง

function renderRemotePlayers() {
  if (!roomState) return;
  roomState.players.filter((item) => item.id !== selfId).forEach((item) => {
    remoteTargets.set(item.id, item);
    if (!remoteRendered.has(item.id)) remoteRendered.set(item.id, { x: item.x, y: item.y });
  });
  [...remoteRendered.keys()].forEach((id) => {
    if (!remoteTargets.has(id)) remoteRendered.delete(id);
  });
}

function animateRemotePlayers() {
  otherPlayers.replaceChildren();
  remoteTargets.forEach((target, id) => {
    const rendered = remoteRendered.get(id);
    rendered.x += (target.x - rendered.x) * 0.25; // lerp factor ปรับได้ตามความลื่นที่ต้องการ
    rendered.y += (target.y - rendered.y) * 0.25;
    // สร้าง <g> element แล้ว translate ด้วย rendered.x, rendered.y แทน item.x, item.y (โค้ดเดิมใน renderRemotePlayers)
  });
  requestAnimationFrame(animateRemotePlayers);
}
```

เรียก `animateRemotePlayers()` แยก loop ต่างหาก (เริ่มครั้งเดียวตอนเข้าเกม ไม่ต้องผูกกับ event `room-state`)

### แก้ที่ 3 (เสริม): เพิ่ม Tick Rate ของ Server

```js
room.movementTimer = setInterval(() => updateMovement(room), 50); // 
```

---

## สรุปลำดับความสำคัญ

1. **แก้ที่ 1 ก่อน** — ผลกระทบเยอะสุด จะรู้สึกได้ทันทีว่าตัวเองตอบสนองไวขึ้นมาก
2. **แก้ที่ 2** — ทำให้เห็นผู้เล่นอื่นเคลื่อนไหวลื่นขึ้น ไม่กระโดดเป็นสเต็ป
3. **แก้ที่ 3** — เสริมเล็กน้อย ทำได้ถ้าต้องการความลื่นเพิ่มอีกขั้น

ไม่จำเป็นต้องอัปเกรด Render plan หรือเปลี่ยน hosting เพราะปัญหาไม่ได้อยู่ที่ CPU/network capacity แต่อยู่ที่วิธี sync ตำแหน่งในโค้ด