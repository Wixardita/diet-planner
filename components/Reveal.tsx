"use client";
import { motion } from "framer-motion";
export function Reveal({children, delay=0}:{children:React.ReactNode; delay?:number}){return <motion.div initial={{opacity:0,y:28}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-80px"}} transition={{duration:.8,delay,ease:[.22,1,.36,1]}}>{children}</motion.div>}
