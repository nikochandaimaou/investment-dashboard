const CODE=/^[0-9][0-9A-Z]{3}$/;
export function extractQuote(payload,code){
 const meta=payload?.chart?.result?.[0]?.meta;
 if(payload?.chart?.error || !meta || meta.symbol!==`${code}.T` || meta.currency!=='JPY' || !Number.isFinite(meta.regularMarketPrice) || meta.regularMarketPrice<=0 || meta.regularMarketPrice>1e12 || !Number.isFinite(meta.regularMarketTime) || meta.regularMarketTime<946684800 || meta.regularMarketTime>Date.now()/1000+300)throw new Error('Valid JPY quote unavailable');
 return {code,price:meta.regularMarketPrice,currency:'JPY',time:meta.regularMarketTime,source:'Yahoo Finance'};
}
export async function handleRequest(request,env={},fetcher=fetch){
 const origin=request.headers.get('Origin');const allowed=env.ALLOWED_ORIGIN;
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(!allowed)return Response.json({error:'ALLOWED_ORIGIN must be configured'},{status:503,headers});
 if(origin && origin!==allowed)return Response.json({error:'Origin not allowed'},{status:403,headers});
 headers['Access-Control-Allow-Origin']=allowed;headers['Access-Control-Allow-Methods']='GET, OPTIONS';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405,headers});
 const code=new URL(request.url).searchParams.get('code');if(!CODE.test(code??''))return Response.json({error:'Invalid security code'},{status:400,headers});
 try{
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${code}.T?interval=1d&range=1d`;
  const upstream=await fetcher(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)return Response.json({error:'Quote provider unavailable'},{status:upstream.status===429?429:502,headers});
  return Response.json(extractQuote(await upstream.json(),code),{headers});
 }catch{return Response.json({error:'Quote unavailable'},{status:502,headers});}
}
export default {fetch(request,env){return handleRequest(request,env);}};
