const PORTFOLIO_KEY='my-portfolio-v1';
const UNITS_KEY='portfolio-fund-units-v1';
const ENDPOINT_KEY='portfolio-quote-endpoint';
const FUND_CODE='0331418A';
export function validateFundNav(q){
 if(!q || q.code!==FUND_CODE || q.currency!=='JPY' || typeof q.nav!=='number' || !Number.isFinite(q.nav) || q.nav<=0 || q.nav>1e9 || typeof q.date!=='string' || !/^20\d{2}-\d{2}-\d{2}$/.test(q.date))throw new Error('オルカンの基準価額データが正しくありません。');
 return q;
}
export function calculateFundValue(units,nav){
 if(!Number.isInteger(units) || units<=0 || units>1e15)throw new Error('保有口数は1以上の整数で入力してください。');
 if(typeof nav!=='number' || !Number.isFinite(nav) || nav<=0)throw new Error('基準価額が正しくありません。');
 return Math.round(units*nav/10000);
}
function readPortfolio(){try{const data=JSON.parse(localStorage.getItem(PORTFOLIO_KEY)||'null');return data?.version===1&&Array.isArray(data.assets)?data:null;}catch{return null;}}
function readUnits(){try{const data=JSON.parse(localStorage.getItem(UNITS_KEY)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch{return {};}}
function writeUnits(map){localStorage.setItem(UNITS_KEY,JSON.stringify(map));}
function setup(){
 const panel=document.querySelector('#fund-auto');if(!panel)return;
 const select=document.querySelector('#fund-asset'),input=document.querySelector('#fund-units'),save=document.querySelector('#fund-save'),refresh=document.querySelector('#fund-refresh'),status=document.querySelector('#fund-status');
 const setStatus=text=>{status.textContent=text;};
 const populate=()=>{const portfolio=readPortfolio();const funds=portfolio?.assets.filter(a=>a.type==='fund')??[];const current=select.value;select.replaceChildren();for(const fund of funds){const option=document.createElement('option');option.value=fund.id;option.textContent=`${fund.name}${fund.institution?`（${fund.institution}／${fund.account}）`:''}`;select.append(option);}if(current&&funds.some(f=>f.id===current))select.value=current;select.disabled=!funds.length;save.disabled=!funds.length;refresh.disabled=!funds.length;if(!funds.length){input.value='';input.disabled=true;setStatus('オルカンを登録すると自動更新を設定できます。');return;}input.disabled=false;const units=readUnits();input.value=units[select.value]??'';};
 const refreshFund=async({reload=true}={})=>{const portfolio=readPortfolio();if(!portfolio){setStatus('資産データを読み込めませんでした。');return;}const unitsMap=readUnits();const targets=portfolio.assets.filter(a=>a.type==='fund'&&Number.isInteger(Number(unitsMap[a.id]))&&Number(unitsMap[a.id])>0);if(!targets.length){setStatus('保有口数を保存すると基準価額から評価額を自動更新します。');return;}const endpoint=localStorage.getItem(ENDPOINT_KEY)||'';if(!endpoint){setStatus('先に「価格取得サービスのURL」を設定してください。');return;}try{setStatus('オルカンの基準価額を取得しています…');const url=new URL(endpoint);url.searchParams.set('fund',FUND_CODE);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);let response;try{response=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});}finally{clearTimeout(timer);}if(!response.ok)throw new Error(response.status===429?'取得サービスが混雑しています。時間を置いて再試行してください。':'基準価額を取得できませんでした。');const quote=validateFundNav(await response.json());let changed=false;const assets=portfolio.assets.map(asset=>{if(asset.type!=='fund')return asset;const units=Number(unitsMap[asset.id]);if(!Number.isInteger(units)||units<=0)return asset;const amount=calculateFundValue(units,quote.nav);if(asset.amount===amount&&asset.fundNav===quote.nav&&asset.fundNavDate===quote.date&&asset.fundNavSource===(quote.source??'Yahoo!ファイナンス'))return asset;changed=true;return {...asset,amount,fundNav:quote.nav,fundNavDate:quote.date,fundNavSource:quote.source??'Yahoo!ファイナンス'};});if(changed){localStorage.setItem(PORTFOLIO_KEY,JSON.stringify({...portfolio,assets,updated:new Date().toISOString()}));const message=`オルカンを更新しました。基準価額 ${quote.nav.toLocaleString('ja-JP')}円（${quote.date}）`;if(reload){sessionStorage.setItem('portfolio-fund-message',message);location.reload();return;}setStatus(message);}else setStatus(`基準価額 ${quote.nav.toLocaleString('ja-JP')}円（${quote.date}）・評価額は最新です。`);}catch(error){setStatus(error.name==='AbortError'?'基準価額の取得がタイムアウトしました。':error.message);}};
 select.addEventListener('change',()=>{input.value=readUnits()[select.value]??'';});
 save.addEventListener('click',()=>{try{const units=Number(input.value);calculateFundValue(units,1);const map=readUnits();map[select.value]=units;writeUnits(map);setStatus('保有口数を保存しました。基準価額を取得します…');refreshFund();}catch(error){setStatus(error.message);}});
 refresh.addEventListener('click',()=>refreshFund());
 populate();const message=sessionStorage.getItem('portfolio-fund-message');if(message){sessionStorage.removeItem('portfolio-fund-message');setStatus(message);}setTimeout(()=>refreshFund(),1500);setInterval(()=>{populate();refreshFund();},3600000);
}
if(typeof document!=='undefined')setup();
