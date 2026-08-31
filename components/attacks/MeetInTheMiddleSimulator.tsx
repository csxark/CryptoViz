'use client';

import { useMemo, useState, useId } from 'react'
import { doubleDesEncrypt, meetInTheMiddleAttack, type MitmStep } from '@/lib/attacks/meetInTheMiddle'
import { useAttackWorker } from '@/hooks/useAttackWorker'
import AttackControlBar from './AttackControlBar'
import OracleQueryLogViewer from './OracleQueryLogViewer'

const hexToBytes=(hex:string)=>{const c=hex.replace(/\s+/g,'');if(!/^[0-9a-fA-F]{16}$/.test(c))throw new Error('Plaintext/key values must be exactly 16 hex characters.');const o=new Uint8Array(8);for(let i=0;i<8;i++)o[i]=parseInt(c.slice(i*2,i*2+2),16);return o}
const hex=(b:Uint8Array)=>Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('')
const DEFAULT_P='0123456789abcdef', DEFAULT_A='00000000000012ab', DEFAULT_B='0000000000003ecd'

export default function MeetInTheMiddleSimulator(){
  const [plaintext,setPlaintext]=useState(DEFAULT_P),[keyA,setKeyA]=useState(DEFAULT_A),[keyB,setKeyB]=useState(DEFAULT_B),[bits,setBits]=useState(16)
  const [steps,setSteps]=useState<MitmStep[]>([]),[cursor,setCursor]=useState(-1),[running,setRunning]=useState(false),[error,setError]=useState<string|null>(null)
  const plaintextId = useId();
  const keyAId = useId();
  const keyBId = useId();
  const bitsId = useId();
  const {runMitmAttack,cancel}=useAttackWorker()
  const current=steps[cursor]
  const log=useMemo(()=>steps.slice(0,cursor+1).map((s,i)=>({index:i,label:s.label,detail:s.detail,status:s.label.includes('collision')?'match' as const:'info' as const})),[steps])
  async function run(){
    setError(null);setSteps([]);setCursor(-1);setRunning(true)
    try{
      const p=hexToBytes(plaintext),a=hexToBytes(keyA),b=hexToBytes(keyB),c=doubleDesEncrypt(p,a,b)
      const result=await runMitmAttack(hex(p),hex(c),bits,s=>setSteps(prev=>[...prev,s]))
      setSteps(result.steps);setCursor(-1)
    }catch(e){
      try{
        const p=hexToBytes(plaintext),a=hexToBytes(keyA),b=hexToBytes(keyB),c=doubleDesEncrypt(p,a,b)
        const result=meetInTheMiddleAttack(p,c,bits,s=>setSteps(prev=>[...prev,s]))
        setSteps(result.steps);setCursor(-1)
      }catch(inner){setError(inner instanceof Error?inner.message:String(inner))}
    }finally{setRunning(false)}
  }
  return <div className="space-y-5">
    <div className="grid gap-3 rounded-lg border p-5">
      <div className="flex flex-col"><label htmlFor={plaintextId} className="text-sm">Known plaintext</label><input id={plaintextId} className="mt-1 w-full rounded border px-2 py-2 font-mono" value={plaintext} onChange={e=>setPlaintext(e.target.value)}/></div>
      <div className="grid gap-3 sm:grid-cols-2"><div className="flex flex-col"><label htmlFor={keyAId} className="text-sm">Target key 1</label><input id={keyAId} className="mt-1 w-full rounded border px-2 py-2 font-mono" value={keyA} onChange={e=>setKeyA(e.target.value)}/></div><div className="flex flex-col"><label htmlFor={keyBId} className="text-sm">Target key 2</label><input id={keyBId} className="mt-1 w-full rounded border px-2 py-2 font-mono" value={keyB} onChange={e=>setKeyB(e.target.value)}/></div></div>
      <div className="flex flex-col"><label htmlFor={bitsId} className="text-sm">Reduced keyspace: {bits} bits</label><input id={bitsId} type="range" min={8} max={20} value={bits} onChange={e=>setBits(+e.target.value)} className="w-full"/></div>
      <button onClick={run} disabled={running} className="w-fit rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{running?'Building trace…':'Prepare interactive MitM'}</button>
      {error&&<p className="text-sm text-red-600">{error}</p>}
    </div>
    {steps.length>0&&<div className="space-y-4">
      <AttackControlBar running={false} canPrevious={cursor>=0} canNext={cursor<steps.length-1} onPlay={()=>setRunning(true)} onPause={()=>setRunning(false)} onPrevious={()=>setCursor(c=>Math.max(-1,c-1))} onNext={()=>setCursor(c=>Math.min(steps.length-1,c+1))} onReset={()=>setCursor(-1)} />
      <div className="text-xs text-zinc-500">Trace step {Math.max(0,cursor+1)} / {steps.length}</div>
      {current&&<div className="rounded-lg border p-4"><h3 className="font-semibold">{current.label}</h3><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{current.detail}</p></div>}
      <OracleQueryLogViewer entries={log}/>
    </div>}
  </div>
}
