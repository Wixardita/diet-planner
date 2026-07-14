export type PrivateAccessPayload = { name:string; email:string; country:string; interest:string; message:string; consent:boolean };
export async function submitPrivateAccess(payload: PrivateAccessPayload) {
  const endpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;
  if (!endpoint) { await new Promise((r)=>setTimeout(r,700)); return { ok:true, simulated:true }; }
  const response = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response.ok) throw new Error("Submission failed");
  return { ok:true, simulated:false };
}
