#!/usr/bin/env node
import assert from 'node:assert/strict';

const IT_STOPWORDS = new Set([
  'a','ad','al','allo','ai','agli','all','agl','alla','alle',
  'da','dal','dallo','dai','dagli','dall','dalla','dalle',
  'di','del','dello','dei','degli','dell','della','delle',
  'in','nel','nello','nei','negli','nell','nella','nelle',
  'con','su','per','tra','fra',
  'e','ed','o','od'
]);

function normalizeText(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeWords(s, { removeStopwords = false } = {}){
  const n = normalizeText(s);
  if(!n) return [];
  const words = n.split(' ').filter(Boolean);
  return removeStopwords ? words.filter((w)=>!IT_STOPWORDS.has(w)) : words;
}

function levenshtein(a,b){
  const m = a.length, n = b.length;
  if(!m) return n;
  if(!n) return m;
  const dp = Array.from({length:m+1}, ()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function similarityScore(a,b){
  const aa = normalizeText(a);
  const bb = normalizeText(b);
  if(!aa || !bb) return 0;
  const d = levenshtein(aa, bb);
  return 1 - (d / Math.max(aa.length, bb.length, 1));
}

function tokenMatchScore(queryToken, token){
  if(!queryToken || !token) return 0;
  if(queryToken === token) return 1;
  const shortest = Math.min(queryToken.length, token.length);
  if(shortest >= 3 && (token.startsWith(queryToken) || queryToken.startsWith(token))) return 0.95;
  if(shortest >= 4 && token.includes(queryToken)) return 0.9;
  const sim = similarityScore(queryToken, token);
  return sim >= 0.86 ? sim : 0;
}

function rankQueryAgainstTokens(queryTokens, tokens){
  if(!queryTokens.length || !tokens.length) return null;
  let sum = 0;
  for(const q of queryTokens){
    let bestForToken = 0;
    for(const t of tokens) bestForToken = Math.max(bestForToken, tokenMatchScore(q, t));
    if(bestForToken <= 0) return null;
    sum += bestForToken;
  }
  return sum / queryTokens.length;
}

function localSearch(foods, term){
  const qn = normalizeText(term);
  const queryTokens = tokenizeWords(qn, { removeStopwords:true });
  if(!queryTokens.length) return [];

  return foods
    .filter((f)=>{
      const candidates = [f.name, ...(f.aliases || [])].map(normalizeText).filter(Boolean);
      return candidates.some((candidate)=>{
        const candidateTokens = tokenizeWords(candidate, { removeStopwords:true });
        return rankQueryAgainstTokens(queryTokens, candidateTokens) !== null;
      });
    });
}

const foods = [
  { name:'PASTA DI SEMOLA, cruda', aliases:['pasta semola cruda'] },
  { name:'PASTA DI SEMOLA, cotta', aliases:['pasta semola cotta'] },
  { name:'PETTO DI POLLO', aliases:['pollo petto'] },
  { name:'OLIO DI OLIVA', aliases:['olio oliva'] },
  { name:'FARINA DI MAIS', aliases:[] }
];

const pastaResults = localSearch(foods, 'pasta');
assert(pastaResults.some((x)=>normalizeText(x.name).includes('pasta di semola')), '"pasta" deve trovare "PASTA DI SEMOLA"');

const pastaSemolaResults = localSearch(foods, 'pasta di semola');
assert(pastaSemolaResults.length > 0, '"pasta di semola" deve restituire risultati');
assert(pastaSemolaResults.every((x)=>normalizeText(x.name).includes('pasta') || normalizeText((x.aliases||[]).join(' ')).includes('pasta')), '"pasta di semola" non deve essere dominata da match su "di"');

const polloResults = localSearch(foods, 'pollo');
assert(polloResults.some((x)=>normalizeText(x.name).includes('pollo')), '"pollo" deve continuare a funzionare');

console.log('search_sanity_check: ok');
