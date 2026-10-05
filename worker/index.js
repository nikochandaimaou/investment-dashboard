const CODE=/^[0-9][0-9A-Z]{3}$/;
const FUND_CODE='0331418A';
export function extractQuote(payload,code){
 const meta=payload?.chart?.result?.[0]?.meta;
 if(payload?.chart?.error || !meta || meta.symbol!==`${code}.T` || meta.currency!=='JPY' || !Number.isFinite(meta.regularMarketPrice) || meta.regularMarketPrice<=0 || meta.regularMarketPrice>1e12 || !Number.isFinite(meta.regularMarketTime) || meta.regularMarketTime<946684800 || meta.regularMarketTime>Date.now()/1000+300)throw new Error('Valid JPY quote unavailable');
 return {code,price:meta.regularMarketPrice,currency:'JPY',time:meta.regularMarketTime,source:'Yahoo Finance'};
}
export function extractFundNav(document,code=FUND_CODE){
 const plain=String(document??'')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&(?:nbsp|#160);/gi,' ')
  .replace(/&#x2F;|&#47;/gi,'/')
  .replace(/&minus;|&#8722;|&#x2212;/gi,'-')
  .replace(/&amp;/gi,'&')
  .replace(/\|/g,' ')
  .replace(/\s+/g,' ');
 const match=plain.match(/(20\d{2})[\/-](\d{1,2})[\/-](\d{1,2})\s+([0-9]{1,3}(?:,[0-9]{3})+)\s+[+\-−]?[0-9,]+/);
 if(!match)throw new Error('Valid fund NAV unavailable');
 const [,year,month,day,rawNav]=match;
 const nav=Number(rawNav.replace(/,/g,''));
 const date=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
 const time=Date.parse(`${date}T00:00:00+09:00`)/1000;
 if(code!==FUND_CODE || !Number.isFinite(nav) || nav<=0 || nav>1e9 || !Number.isFinite(time) || time<946684800 || time>Date.now()/1000+172800)throw new Error('Valid fund NAV unavailable');
 return {code,nav,currency:'JPY',date,source:'Yahoo!ファイナンス'};
}
async function fetchFundDocument(code,fetcher){
 const targets=[
  `https://finance.yahoo.co.jp/quote/${code}/history?timeFrame=d`,
  `https://r.jina.ai/https://finance.yahoo.co.jp/quote/${code}/history`
 ];
 let lastStatus=502;
 for(const target of targets){
  try{
   const upstream=await fetcher(target,{headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,text/plain;q=0.9,*/*;q=0.8'},signal:AbortSignal.timeout(10000)});
   if(!upstream.ok){lastStatus=upstream.status===429?429:502;continue;}
   const text=await upstream.text();
   try{return extractFundNav(text,code);}catch{}
  }catch{}
 }
 const error=new Error('Fund provider unavailable');error.status=lastStatus;throw error;
}
export async function handleRequest(request,env={},fetcher=fetch){
 const origin=request.headers.get('Origin');const allowed=env.ALLOWED_ORIGIN;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(!allowed)return Response.json({error:'ALLOWED_ORIGIN must be configured'},{status:503,headers});
 if(origin && origin!==allowed)return Response.json({error:'Origin not allowed'},{status:403,headers});
 headers['Access-Control-Allow-Origin']=allowed;headers['Access-Control-Allow-Methods']='GET, OPTIONS';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers});
 const url=new URL(request.url);const fund=url.searchParams.get('fund');
 if(fund!==null){
  if(fund!==FUND_CODE)return Response.json({error:'Invalid fund code'},{status:400,headers});
  try{return Response.json(await fetchFundDocument(fund,fetcher),{headers});}
  catch(error){return Response.json({error:'Fund NAV unavailable'},{status:error?.status===429?429:502,headers});}
 }
 const code=url.searchParams.get('code');if(!CODE.test(code??''))return Response.json({error:'Invalid security code'},{status:400,headers});
 try{
  const upstream=await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.T?interval=1d&range=1d`,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)return Response.json({error:'Quote provider unavailable'},{status:upstream.status===429?429:502,headers});
  return Response.json(extractQuote(await upstream.json(),code),{headers});
 }catch{return Response.json({error:'Quote unavailable'},{status:502,headers});}
}
export default {fetch(request,env){return handleRequest(request,env);}};
