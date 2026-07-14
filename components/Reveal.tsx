"use client";
import { motion } from "framer-motion";
export function Reveal({children, delay=0}:{children:React.ReactNode; delay?:number}){return <motion.div initial={{opacity:0,y:56,scale:.985}} whileInView={{opacity:1,y:0,scale:1}} viewport={{once:false,amount:.22,margin:"-70px"}} transition={{duration:.95,delay,ease:[.16,1,.3,1]}}>{children}</motion.div>}
