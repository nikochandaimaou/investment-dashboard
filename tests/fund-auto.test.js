import test from 'node:test';import assert from 'node:assert/strict';
import {validateFundNav,calculateFundValue} from '../fund-auto.js';
const q={code:'0331418A',nav:37827,currency:'JPY',date:'2026-10-02',source:'Yahoo!ファイナンス'};
test('保有口数と基準価額からオルカン評価額を計算する',()=>{assert.equal(calculateFundValue(100000,37827),378270);assert.equal(calculateFundValue(26436,37827),99999);assert.throws(()=>calculateFundValue(0,37827));assert.throws(()=>calculateFundValue(1.5,37827));});
test('オルカン基準価額レスポンスを検証する',()=>{assert.deepEqual(validateFundNav(q),q);assert.throws(()=>validateFundNav({...q,code:'x'}));assert.throws(()=>validateFundNav({...q,currency:'USD'}));assert.throws(()=>validateFundNav({...q,date:'10/2'}));});
