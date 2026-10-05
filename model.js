import {validCode} from './quotes.js';
export const TYPES = {cash:'現金',bond:'個人向け国債',fund:'オルカン',stock:'日本株'};
export const COLORS = {cash:'#adc9be',bond:'#deb577',fund:'#558f83',stock:'#274e49'};
export function validateAsset(a) {
 if (!a || !Object.hasOwn(TYPES,a.type) || typeof a.id !== 'string' || !a.id || typeof a.name !== 'string' || !a.name.trim() || a.name.length > 80) throw new Error('資産の名前・種類が正しくありません。');
 for (const key of ['institution','account']) if (a[key] !== undefined && (typeof a[key] !== 'string' || a[key].length > 80)) throw new Error('金融機関・口座名は80文字以内で入力してください。');
 if (!!a.institution?.trim() !== !!a.account?.trim()) throw new Error('金融機関と口座名を両方入力してください。');
 if(a.type==='stock'){
  if(a.code !== undefined && a.code !== '' && !validCode(a.code))throw new Error('証券コードは7203、130Aなどの4文字で入力してください。');
  if(a.price===null && !validCode(a.code))throw new Error('未取得の株価には証券コードが必要です。');
  if(a.quoteTime !== undefined && (typeof a.quoteTime!=='number' || !Number.isFinite(a.quoteTime) || a.quoteTime<946684800 || a.quoteTime>Date.now()/1000+300))throw new Error('株価の日時が正しくありません。');
  if(a.quoteSource !== undefined && (typeof a.quoteSource!=='string' || a.quoteSource.length>80))throw new Error('株価の取得元が正しくありません。');
 }
 const keys = a.type === 'stock' ? ['shares','cost','price'] : a.type === 'fund' ? ['amount','invested'] : ['amount'];
 for (const key of keys) if (!(key==='price' && a.price===null) && (typeof a[key] !== 'number' || !Number.isFinite(a[key]) || a[key] < 0 || a[key] > 1e12)) throw new Error('金額・株数は0以上の有効な数値を入力してください。');
 if (a.type === 'stock' && (!Number.isInteger(a.shares) || a.shares === 0)) throw new Error('株数は1以上の整数を入力してください。');
 if (!Number.isFinite(value(a)) || value(a) > 1e15) throw new Error('評価額が大きすぎます。入力を確認してください。');
 return a;
}
export function value(a) {return a.type === 'stock' ? a.shares * a.price : a.amount;}
export function cost(a) {return a.type === 'stock' ? a.shares*a.cost : a.type === 'fund' ? a.invested : a.amount;}
export function summary(assets) {
 const allocation = Object.fromEntries(Object.keys(TYPES).map(t=>[t,0])); let total=0, profit=0, invested=0;
 for (const a of assets) { const v=value(a); if(a.type==='stock' && a.price===null)continue; total+=v; allocation[a.type]+=v; if (['stock','fund'].includes(a.type)) {profit+=v-cost(a);invested+=cost(a);} }
 return {total,profit,rate:invested ? profit/invested*100 : null,allocation};
}
export function parseBackup(text) {
 const data=JSON.parse(text);
 if (data?.version !== 1 || !Array.isArray(data.assets) || data.assets.length > 1000) throw new Error('このアプリのバックアップファイルを選んでください。');
 const ids=new Set(); for(const a of data.assets){validateAsset(a);if(ids.has(a.id))throw new Error('資産IDが重複しています。');ids.add(a.id);}
 return {version:1,assets:data.assets,updated:typeof data.updated==='string' ? data.updated : null};
}

// Each asset has exactly one institution/account pair; groups never own asset copies.
export function institutionSummary(assets) {
 const groups=new Map();
 for (const a of assets) {
  if(a.type==='stock' && a.price===null)continue;
  const institution=a.institution?.trim() || '口座未登録';
  const account=a.account?.trim() || '未登録';
  if(!groups.has(institution))groups.set(institution,{name:institution,total:0,accounts:new Map()});
  const group=groups.get(institution);group.total+=value(a);
  group.accounts.set(account,(group.accounts.get(account) || 0)+value(a));
 }
 return [...groups.values()].map(g=>({...g,accounts:[...g.accounts].map(([name,total])=>({name,total}))}));
}
