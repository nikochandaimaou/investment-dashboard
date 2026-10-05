export function normalizeCode(code) {return String(code??'').trim().toUpperCase().replace(/\.T$/,'');}
export function validCode(code) {return typeof code==='string' && /^[0-9][0-9A-Z]{3}$/.test(code);}
export function validateQuote(quote,code) {
 if (!quote || quote.code!==code || typeof quote.price!=='number' || !Number.isFinite(quote.price) || quote.price<=0 || quote.price>1e12 || quote.currency!=='JPY' || typeof quote.time!=='number' || !Number.isFinite(quote.time) || quote.time<946684800 || quote.time>Date.now()/1000+300) throw new Error('株価データが正しくありません。以前の価格を維持します。');
 return quote;
}
export async function fetchQuote(endpoint,code,{fetcher=fetch,signal}={}) {
 if(!validCode(code))throw new Error('証券コードを確認してください。');
 const url=new URL(endpoint);if(url.protocol!=='https:' && !(url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('株価取得URLはHTTPSで入力してください。');
 url.searchParams.set('code',code);
 const response=await fetcher(url,{signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
 if(!response.ok)throw new Error(response.status===429?'株価サービスが混雑しています。時間を置いて再試行してください。':'株価を取得できませんでした。接続先と証券コードを確認してください。');
 return validateQuote(await response.json(),code);
}
export function applyQuotes(assets,quotes) {
 return assets.map(a=>{const q=a.type==='stock' && quotes.get(a.code);if(!q)return a;validateQuote(q,a.code);if(a.quoteTime && q.time<a.quoteTime)return a;return {...a,price:q.price,quoteTime:q.time,quoteSource:q.source??'Yahoo Finance'};});
}
