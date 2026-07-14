import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap { const base="https://altiora-estates.example"; return ["/","/privacy","/legal"].map((url)=>({url:base+url,lastModified:new Date()})); }
