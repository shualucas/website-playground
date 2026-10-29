import test from "node:test";
import assert from "node:assert/strict";
import { createWeatherHandler } from "../api/weather.js";

const response = () => ({ headers:{}, statusCode:0, body:"", setHeader(key,value) { this.headers[key]=value; }, end(body="") { this.body=body; } });

test("SF weather shares concurrent requests and refreshes after fifteen minutes", async () => {
  let calls=0, now=0, finish;
  const handler=createWeatherHandler({ clock:()=>now, fetcher:async endpoint=>{
    const url=new URL(endpoint); assert.equal(url.searchParams.get("latitude"),"37.7749"); assert.equal(url.searchParams.get("temperature_unit"),"fahrenheit");
    calls++; if(calls===1) await new Promise(resolve=>{finish=resolve});
    return {ok:true,json:async()=>({current:{temperature_2m:57.6,weather_code:45}})};
  }});
  const a=response(),b=response(); const pending=[handler({method:"GET"},a),handler({method:"GET"},b)]; finish(); await Promise.all(pending);
  assert.equal(calls,1); assert.equal(a.body,b.body); assert.deepEqual(JSON.parse(a.body),{temperature:58,condition:"Fog",city:"San Francisco"});
  now=899999; await handler({method:"GET"},response()); assert.equal(calls,1);
  now=900000; await handler({method:"GET"},response()); assert.equal(calls,2);
});

test("weather failures and malformed data return a generic uncached response", async () => {
  for(const fetcher of [async()=>{throw Error("Private upstream detail")},async()=>({ok:false}),async()=>({ok:true,json:async()=>({current:{temperature_2m:null,weather_code:45}})})]) {
    const res=response(); await createWeatherHandler({fetcher})({method:"GET"},res);
    assert.equal(res.statusCode,502); assert.equal(res.headers["Cache-Control"],"no-store"); assert.equal(JSON.parse(res.body).error,"Weather is temporarily unavailable.");
  }
});
