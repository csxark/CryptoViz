'use client';

import { useEffect, useRef, useState, useId } from 'react'
import { VulnerableMac, forgeLengthExtension, type LengthExtensionStep } from '@/lib/attacks/lengthExtension'
import AttackControlBar from './AttackControlBar'
import OracleQueryLogViewer from './OracleQueryLogViewer'

const enc=(s:string)=>new TextEncoder().encode(s)
const dec=(b:Uint8Array)=>new TextDecoder().decode(b)

export default function LengthExtensionSimulator(){
 const [secret,setSecret]=useState('sup3r-s3cr3t-key'),[message,setMessage]=useState('amount=10&to=alice'),[appendData,setAppendData]=useState('&admin=true'),[secretLength,setSecretLength]=useState(17)
 const [steps,setSteps]=useState<LengthExtensionStep[]>([]),[cursor,setCursor]=useState(-1),[running,setRunning]=useState(false),[leaked,setLeaked]=useState<string|null>(null),[forged,setForged]=useState<string|null>(null),[mac,setMac]=useState<string|null>(null),[accepted,setAccepted]=useState<boolean|null>(null),[error,setError]=useState<string|null>(null)
 const secretId = useId();
 const messageId = useId();
 const appendDataId = useId();
 const secretLengthId = useId();
 const timer=useRef<ReturnType<typeof setInterval>|null>(null)
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[])
 function run(){
   if(timer.current)clearInterval(timer.current);setRunning(false);setError(null);setSteps([]);setCursor(-1)
   try{
    const oracle=new VulnerableMac(enc(secret)), original=enc(message), append=enc(appendData), leakedMac=oracle.sign(original)
    const result=forgeLengthExtension(leakedMac,secretLength,original,append)
    setLeaked(leakedMac);setSteps(result.steps);setForged(dec(result.forgedMessage));setMac(result.forgedHashHex);setAccepted(oracle.verify(result.forgedMessage,result.forgedHashHex))
   }catch(e){setError(e instanceof Error?e.message:String(e))}
 }
 function play(){if(!steps.length)return;setRunning(true);timer.current=setInterval(()=>setCursor(c=>{if(c>=steps.length-1){if(timer.current)clearInterval(timer.current);setRunning(false);return c}return c+1}),500)}
 function pause(){if(timer.current)clearInterval(timer.current);setRunning(false)}
 const current=steps[cursor]
 const log=steps.slice(0,cursor+1).map((s,i)=>({index:i,label:s.label,detail:s.detail,status:'info' as const}))
 return <div className="space-y-5">
  <div className="grid gap-3 rounded-lg border p-5">
   <div className="flex flex-col"><label htmlFor={secretId} className="text-sm">Demo server secret (custom target)</label><input id={secretId} className="mt-1 w-full rounded border px-2 py-2" value={secret} onChange={e=>setSecret(e.target.value)}/></div>
   <div className="flex flex-col"><label htmlFor={messageId} className="text-sm">Original message</label><input id={messageId} className="mt-1 w-full rounded border px-2 py-2" value={message} onChange={e=>setMessage(e.target.value)}/></div>
   <div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col"><label htmlFor={appendDataId} className="text-sm">Data to append</label><input id={appendDataId} className="mt-1 w-full rounded border px-2 py-2" value={appendData} onChange={e=>setAppendData(e.target.value)}/></div><div className="flex flex-col"><label htmlFor={secretLengthId} className="text-sm">Guessed secret length</label><input id={secretLengthId} type="number" min={0} className="mt-1 w-full rounded border px-2 py-2" value={secretLength} onChange={e=>setSecretLength(+e.target.value)}/></div></div>
   <button onClick={run} className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white">Prepare interactive extension</button>{error&&<p className="text-sm text-red-600">{error}</p>}
   {leaked&&<p className="break-all text-xs text-zinc-500">Leaked MAC: <code>{leaked}</code></p>}
  </div>
  {steps.length>0&&<div className="space-y-4">
   <AttackControlBar running={running} canPrevious={cursor>=0} canNext={cursor<steps.length-1} onPlay={play} onPause={pause} onPrevious={()=>setCursor(c=>Math.max(-1,c-1))} onNext={()=>setCursor(c=>Math.min(steps.length-1,c+1))} onReset={()=>{pause();setCursor(-1)}}/>
   <div className="text-xs text-zinc-500">Step {Math.max(0,cursor+1)} / {steps.length}</div>
   {current&&<div className="rounded-lg border border-cyan-300 bg-cyan-50 p-4 dark:bg-cyan-950/20"><h3 className="font-semibold">{current.label}</h3><p className="mt-1 text-sm">{current.detail}</p></div>}
   <OracleQueryLogViewer entries={log}/>
   {cursor===steps.length-1&&forged&&<div className={`rounded border p-4 ${accepted?'border-red-300 bg-red-50':'border-amber-300 bg-amber-50'}`}><div className="font-semibold">Forged request</div><code className="break-all">{forged}</code><p className="mt-2 break-all text-xs">Forged MAC: {mac}</p><p className="mt-2 text-sm">{accepted?'Simulated vulnerable verifier accepted the forged MAC.':'Verifier rejected the forged MAC; check the secret-length guess.'}</p></div>}
  </div>}
 </div>
}
