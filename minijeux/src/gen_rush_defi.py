import random, json, collections, time
N=6
def gen():
    vs=[(2,random.randint(0,2),2,1)]  # r,c,len,horiz
    occ=set((2,vs[0][1]+i) for i in range(2))
    k=random.randint(9,13); tries=0
    while len(vs)<k+1 and tries<300:
        tries+=1
        h=random.random()<.5; L=3 if random.random()<.25 else 2
        if h:
            r=random.randrange(N); 
            if r==2: continue
            c=random.randrange(N-L+1); cells=[(r,c+i) for i in range(L)]
        else:
            c=random.randrange(N); r=random.randrange(N-L+1); cells=[(r+i,c) for i in range(L)]
        if any(x in occ for x in cells): continue
        occ.update(cells); vs.append((r,c,L,int(h)))
    return vs
def cells(v,pos):
    r,c,L,h=v
    return [(r,pos+i) for i in range(L)] if h else [(pos+i,c) for i in range(L)]
def neighbors(vs,st):
    occ={}
    for i,v in enumerate(vs):
        for x in cells(v,st[i]): occ[x]=i
    for i,v in enumerate(vs):
        r,c,L,h=v; p=st[i]
        # backward
        q=p-1
        while q>=0 and ((r,q) if h else (q,c)) not in occ:
            yield st[:i]+(q,)+st[i+1:]; q-=1
        q=p+L
        while q<N and ((r,q) if h else (q,c)) not in occ:
            yield st[:i]+(q-L+1,)+st[i+1:]; q+=1
def analyze(vs):
    st0=tuple(v[1] if v[3] else v[0] for v in vs)
    seen={st0}; dq=collections.deque([st0]); order=[]
    while dq:
        s=dq.popleft(); order.append(s)
        if len(seen)>60000: return None
        for n in neighbors(vs,s):
            if n not in seen: seen.add(n); dq.append(n)
    goals=[s for s in order if s[0]==4]
    if not goals: return None
    dist={g:0 for g in goals}; dq=collections.deque(goals)
    while dq:
        s=dq.popleft()
        for n in neighbors(vs,s):
            if n not in dist: dist[n]=dist[s]+1; dq.append(n)
    return dist
# Grilles très dures pour le défi d'endurance (minimum de coups élevé), dans rush-defi.json.
import sys
DUREE=int(sys.argv[1]) if len(sys.argv)>1 else 480
out={}
t0=time.time()
while time.time()-t0<DUREE:
    vs=gen(); d=analyze(vs)
    if not d: continue
    x=max(d.values())
    if x<16: continue
    s=random.choice([k for k,v in d.items() if v==x])
    puzzle=[[ (v[0] if v[3] else s[i]), (s[i] if v[3] else v[1]), v[2], v[3]] for i,v in enumerate(vs)]
    if len(out.get(x,[]))<6: out.setdefault(x,[]).append({'m':x,'v':puzzle})
liste=[p for k in sorted(out) for p in out[k]]
print(sorted((k,len(v)) for k,v in out.items()))
json.dump(liste,open('rush-defi.json','w'),separators=(',',':'))
