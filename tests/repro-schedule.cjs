const assert=require('node:assert/strict');
const {reproSlots}=require('../outputs/booking-schedule');
const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
for(const withDyno of [true,false]){
  const slots=reproSlots(withDyno),duration=withDyno?150:90;
  assert.equal(slots.length,withDyno?8:12);
  for(const slot of slots){const start=minutes(slot.start),end=minutes(slot.end);assert.equal(end-start,duration);assert.ok(start>=480&&end<=780||start>=840&&end<=1020);}
  assert.equal(slots.at(-1).start,withDyno?'14:30':'15:30');
  assert.equal(slots.at(-1).end,'17:00');
}
console.log('PASS: repro durations, lunch break and closing time');
