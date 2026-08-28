# JobShield AI — Spec v2
## แกนใหม่: Thai Occupation Mobility Network

> เอกสารนี้อัปเดตจาก `jobshield-ai-spec.md` เดิม โดยจัดโครงสร้างใหม่ทั้งหมด เพิ่มรายละเอียด pseudocode ของ path-finding algorithm แบบเต็ม และแก้จุดบกพร่องทางคณิตศาสตร์ในสูตร cost function เดิม

---

## 0. Executive Summary (สำหรับกรรมการ)

JobShield AI ไม่ได้แค่บอกว่า "อาชีพคุณเสี่ยงโดน AI แทนที่แค่ไหน" แต่บอกว่า **"ถ้าจะย้าย ควรย้ายไปอาชีพไหน ผ่านเส้นทางไหน ใช้เวลาน้อยสุด และได้ค่าจ้างดีขึ้น"** โดยสร้างเป็น **เครือข่ายความใกล้เคียงทักษะระหว่างอาชีพ (Occupation Mobility Network)** จากข้อมูลประกาศงานจริงที่ scrape มา แทนที่จะ match ด้วย embedding similarity ตรงๆ แบบระบบทั่วไป

จุดขาย 3 อย่างที่ต่างจากงาน hackathon ทั่วไป:
1. **Explainable ไม่ใช่ black box** — บอกได้ว่า "ทำไมอาชีพ A ถึงใกล้อาชีพ B" เพราะรู้ว่า skill ไหนที่ overlap จริง
2. **มีฐานงานวิจัยรองรับ** — แนวคิด occupation network จากข้อมูลตลาดแรงงานมีงานวิจัยระดับนานาชาติพิสูจน์แล้ว (ตลาดแรงงานฝรั่งเศส, Nature Cities) เราปรับ methodology ให้ใช้ได้กับข้อมูลที่หาได้จริงในไทย (แบบเดียวกับที่ Lightcast ทำ)
3. **Wage Radar ผูกกับกราฟเดียวกัน** — ใช้ centrality ของอาชีพในเครือข่ายมาตรวจจับว่าใครถูกกดค่าแรงเทียบกับอำนาจต่อรองที่ควรมีจริง ไม่ใช่แค่เทียบค่าเฉลี่ยตลาด

---

## 1. ที่มาและงานวิจัยอ้างอิง

งานวิจัยตลาดแรงงานฝรั่งเศส (ใช้ฐานข้อมูลติดตามแรงงานจริงปี 2003–2015) สร้างเครือข่ายอาชีพจากข้อมูลการเปลี่ยนงานจริง โดยตีความว่า "ความง่ายในการย้ายจากอาชีพหนึ่งไปอีกอาชีพหนึ่ง" คือตัวแทนของความใกล้เคียงทักษะระหว่างสองอาชีพนั้น ผลที่พบ:

- ทักษะสามารถโยกย้ายข้ามอาชีพได้มากกว่าที่คิด และความใกล้เคียงของทักษะสำคัญขึ้นเรื่อยๆ ในการอธิบายการเคลื่อนย้ายแรงงาน
- อาชีพที่อยู่ตำแหน่งศูนย์กลาง (central) ของเครือข่าย สัมพันธ์กับค่าจ้างที่สูงกว่าและระยะเวลาว่างงานที่สั้นกว่า

งานวิจัยจาก Nature Cities ยืนยันแนวทางเดียวกัน: การสร้างแบบจำลองตลาดแรงงานเมืองเป็นเครือข่ายอาชีพ ทำให้ข้อมูลทักษะที่เจาะจงมากขึ้นทำนายเส้นทางอาชีพได้แม่นยำกว่า

**ปัญหา:** งานวิจัยเหล่านี้สร้างกราฟจากข้อมูลการเปลี่ยนงานจริงของแรงงานนับล้านคน ซึ่งไทยไม่มีข้อมูลระดับนี้เปิดสาธารณะ ถ้าอ้างว่ามีจะเป็นการโกหกที่ตรวจสอบได้ทันที

**ทางแก้ที่ใช้ได้จริง:** สร้างกราฟจาก **skill co-occurrence ในประกาศงานที่ scrape มา** แทน — นี่คือวิธีเดียวกับที่บริษัทข้อมูลตลาดแรงงานระดับโลกอย่าง Lightcast ใช้จริง (สร้าง skill adjacency จากการวิเคราะห์ประกาศงานจำนวนมาก ไม่ใช่จากข้อมูลเปลี่ยนงาน) และใช้ข้อมูลชุดเดียวกับที่ออกแบบไว้ใน pipeline เดิมอยู่แล้ว — ไม่ต้องรอ partnership กับรัฐก่อนถึงจะเริ่มได้

**ต้องพูดตรงๆ กับกรรมการ:** กราฟที่ได้เป็น *proxy* ของความใกล้เคียงทักษะ ไม่ใช่ *ของจริง* อย่างความง่ายในการเปลี่ยนงานจริงแบบงานวิจัยต้นฉบับ — ความต่างนี้ต้องพูดตอนพรีเซนต์ ไม่ใช่เคลมว่าเทียบเท่า

---

## 2. ภาพรวม Pipeline

```
[ประกาศงาน scrape]
        │
        ▼
[LLM extract skill/task tags]  ──(cache ตอน ingest, ทำครั้งเดียว)
        │
        ▼
[Skill Co-occurrence Graph]  ← น้ำหนัก edge ปรับด้วย PPMI
        │
        ▼
[Occupation Skill Vectors]  →  [Occupation Distance / Adjacency]
        │                              │
        └──────────────┬───────────────┘
                        ▼
         [Occupation Transition Graph]
      (edge weight = skill_distance + risk ของปลายทาง แต่ละ hop)
                        ▼
   [Layer 1: Single-source Dijkstra จากอาชีพปัจจุบัน]
                        ▼
        [Path cost ไปทุกอาชีพในกราฟ พร้อมกันรอบเดียว]
                        ▼
   [Layer 2: จัดอันดับด้วย wage_delta + risk ปลายทาง]
                        ▼
      [Top-N เส้นทางอาชีพแนะนำ + คำอธิบายที่ตรวจสอบได้]
                        │
                        ▼
        [Wage Radar: centrality → สัญญาณโดนกดค่าแรง]
```

---

## 3. ขั้นที่ 1 — Skill Co-occurrence Graph

**แนวคิด:** สอง skill ที่ปรากฏร่วมกันในประกาศงานเดียวกันบ่อยๆ (มากกว่าที่คาดโดยบังเอิญ) แปลว่ามันมักถูกใช้ในบริบทงานเดียวกัน → เอามาสร้างเป็น edge ในกราฟทักษะ

### 3.1 ทำไมต้องใช้ PMI ไม่ใช่ raw frequency

ถ้าใช้ raw co-occurrence count ตรงๆ skill ทั่วไปที่พบทุกประกาศ (เช่น "ทำงานเป็นทีม", "สื่อสารดี") จะมี edge หนักกับทุกอย่าง ครอบงำกราฟ และทำให้ทุกอาชีพดูใกล้กันหมด (เพราะแชร์ skill ทั่วไปเหมือนกัน) — PMI แก้ปัญหานี้โดยหักลบความถี่พื้นฐานของแต่ละ skill ออกก่อน เหลือแต่ "ความสัมพันธ์ที่เกินความคาดหมาย" จริงๆ

### 3.2 Pseudocode

```python
def build_skill_graph(job_postings):
    """
    job_postings: list of postings, แต่ละอันมี .text และ .occupation_code
    คืนค่า: graph ของ skill-to-skill พร้อม PPMI weight
    """
    skill_freq = defaultdict(int)          # จำนวนประกาศที่มี skill นี้
    pair_freq = defaultdict(int)           # จำนวนประกาศที่มี skill คู่นี้ร่วมกัน
    N = len(job_postings)

    for posting in job_postings:
        # แคชผลลัพธ์นี้ตอน ingest — เรียก LLM ครั้งเดียวต่อประกาศ ไม่เรียกซ้ำตอน query
        raw_skills = extract_skills_llm(posting.text)
        skills = canonicalize(raw_skills)      # normalize คำพ้อง เช่น "Excel" / "MS Excel" → เดียวกัน
        skills = unique(skills)

        for s in skills:
            skill_freq[s] += 1
        for s1, s2 in combinations(sorted(skills), 2):
            pair_freq[(s1, s2)] += 1

    edges = {}
    for (s1, s2), freq in pair_freq.items():
        p_s1  = skill_freq[s1] / N
        p_s2  = skill_freq[s2] / N
        p_s12 = freq / N

        pmi = log(p_s12 / (p_s1 * p_s2))
        ppmi = max(pmi, 0)          # Positive PMI — ตัดค่าติดลบ (ความสัมพันธ์ต่ำกว่าบังเอิญ) ทิ้ง ไม่สนใจ

        if ppmi > 0:
            edges[(s1, s2)] = ppmi

    return SkillGraph(nodes=skill_freq.keys(), edges=edges, freq=skill_freq)
```

**หมายเหตุปฏิบัติ:**
- `canonicalize()` ควรทำเป็น dictionary + LLM-assisted clustering แยกต่างหาก (เช่น embedding cluster แล้วให้ LLM ตั้งชื่อ canonical ให้แต่ละ cluster) ไม่งั้น skill เดียวกันจะกระจายเป็นหลาย node ปลอมๆ
- ผลลัพธ์ของขั้นนี้ควร cache เป็นไฟล์/DB แยก ไม่ต้องคำนวณใหม่ทุกครั้งที่มีการ query เส้นทาง — คำนวณใหม่เฉพาะตอนมีข้อมูล ingest เพิ่ม

---

## 4. ขั้นที่ 2 — Occupation Adjacency Network

### 4.1 สร้าง skill vector ต่ออาชีพ

```python
def build_occupation_vectors(job_postings, skill_graph):
    occ_skill_count = defaultdict(Counter)

    for posting in job_postings:
        occ = posting.occupation_code
        skills = canonicalize(extract_skills_llm(posting.text))
        for s in skills:
            occ_skill_count[occ][s] += 1

    occ_vectors = {}
    for occ, counter in occ_skill_count.items():
        total = sum(counter.values())
        vec = {}
        for skill, count in counter.items():
            tf = count / total
            # skill ที่มี degree สูงในกราฟ = skill ทั่วไป (ไม่เฉพาะเจาะจง) → ลดน้ำหนักลง
            specificity = 1 / (skill_graph.degree(skill) + 1)
            vec[skill] = tf * specificity
        occ_vectors[occ] = normalize_l2(vec)

    return occ_vectors
```

### 4.2 ระยะห่างระหว่างอาชีพ (explainable)

จุดสำคัญ: ไม่ใช้ cosine similarity ของ embedding ตรงๆ (แบบเดิม) เพราะบอกไม่ได้ว่า "ทำไมใกล้กัน" — ใช้ overlap ที่ถ่วงน้ำหนักด้วยกราฟทักษะแทน เพื่อให้ตอบคำถามกรรมการได้ว่า skill ไหนคือสาเหตุ

```python
def occupation_distance(occ_a, occ_b, occ_vectors, skill_graph, hop_decay=0.4):
    vec_a, vec_b = occ_vectors[occ_a], occ_vectors[occ_b]

    # 1) direct overlap — skill ที่ตรงกันเป๊ะ
    shared = set(vec_a) & set(vec_b)
    direct = sum(min(vec_a[s], vec_b[s]) for s in shared)

    # 2) indirect overlap — skill ต่างกันแต่เชื่อมกันในกราฟทักษะ (2-hop)
    #    เช่น "SQL" ของอาชีพ A กับ "Data Visualization" ของอาชีพ B ที่มี PPMI edge เชื่อมกัน
    indirect = 0.0
    for sa, wa in vec_a.items():
        for sb, wb in vec_b.items():
            if sa != sb and skill_graph.has_edge(sa, sb):
                indirect += wa * wb * skill_graph.edge_weight(sa, sb) * hop_decay

    similarity = direct + indirect
    distance = 1 - min(similarity, 1.0)      # clamp ให้อยู่ใน [0, 1]

    explanation = sorted(shared, key=lambda s: min(vec_a[s], vec_b[s]), reverse=True)[:5]
    return distance, explanation             # explanation = skill top-5 ที่อธิบายความใกล้เคียง
```

`explanation` คือสิ่งที่ทำให้ระบบ "ตรวจสอบได้" ต่างจาก embedding matching ทั่วไป — ใช้แสดงในหน้า UI ตรงๆ ว่า "ทำไมถึงแนะนำอาชีพนี้"

---

## 5. ขั้นที่ 3 — Multi-Objective Path-Finding (รายละเอียดเต็ม)

### 5.1 จุดบกพร่องของสูตรเดิม และวิธีแก้

สูตรเดิม:

```
cost(u, v) = α·skill_distance(u, v) − β·wage_delta(u, v) + γ·risk_score(v)
```

**ปัญหาที่ 1 — negative edge weight:** เทอม `−β·wage_delta` ทำให้ edge weight เป็นลบได้เมื่อ v มีค่าจ้างสูงกว่า u มาก Dijkstra มาตรฐานอาศัยสมมติฐานว่า edge weight ≥ 0 เสมอ (เพื่อรับประกันว่าเมื่อ pop node ออกจาก priority queue แล้ว ระยะทางของ node นั้น finalize แล้วจริง) ถ้ามี negative edge, node ที่ pop ไปแล้วอาจถูกทำให้ระยะทางสั้นลงอีกทีหลัง แต่ Dijkstra จะไม่ย้อนกลับไปอัปเดต — ผลคือได้ path ที่ไม่ optimal แบบ**เงียบๆ ไม่มี error ให้เห็น** (ต่างจาก bug ทั่วไปที่ crash ให้เห็น อันนี้อันตรายกว่าเพราะดูรันได้ปกติ)

**ปัญหาที่ 2 — wage term ไม่มีผลต่อการเลือกเส้นทางจริง (ถ้า target ตายตัว):** พิสูจน์ได้ด้วย telescoping sum — สำหรับ path ใดๆ `n0 → n1 → ... → nk`:

```
Σ wage_delta(n_i, n_{i+1})  for i = 0..k-1
  = Σ [wage(n_{i+1}) − wage(n_i)]
  = wage(nk) − wage(n0)                    ← พจน์กลางทางหักล้างกันหมด
  = wage(target) − wage(source)
```

ผลรวมค่าจ้างตลอด path จะ**เท่ากันเสมอไม่ว่าจะผ่านอาชีพกลางทางไหน** เพราะฉะนั้นถ้า source กับ target ตายตัว เทอม wage ในสูตรเดิม**ไม่มีผลต่อการเลือกว่าจะผ่านอาชีพไหนระหว่างทางเลย** — มันมีความหมายจริงๆ แค่ตอน "เปรียบเทียบระหว่าง target ที่ต่างกัน" เท่านั้น ซึ่งเป็นคนละปัญหากับ "หา path ที่ดีที่สุดไปยัง target ที่กำหนด"

### 5.2 การออกแบบใหม่ — แยกเป็น 2 ชั้น

จากข้อพิสูจน์ข้างบน วิธีที่ถูกต้องและมีประสิทธิภาพกว่าคือแยกปัญหาเป็น 2 ชั้น:

- **Layer 1 (เลือกเส้นทาง):** ใช้เฉพาะ skill_distance และ risk ของอาชีพที่ผ่านระหว่างทาง (ทั้งสอง non-negative เสมอ) → Dijkstra มาตรฐานถูกต้อง 100% และเป็น **single-source shortest path** คือรันครั้งเดียวจากอาชีพต้นทาง ได้ cost ไปยัง**ทุกอาชีพในกราฟพร้อมกัน** ไม่ต้องรันซ้ำทีละคู่
- **Layer 2 (เลือก target ที่จะแนะนำ):** เอา path cost จาก Layer 1 มารวมกับ wage_delta และ risk ปลายทาง เพื่อจัดอันดับว่าควรแนะนำอาชีพไหนเป็น Top-N

ข้อดี: ถูกต้องทางคณิตศาสตร์ 100%, เร็วกว่า (Dijkstra รอบเดียวแทนที่จะรันทีละคู่), และยังตอบทุกโจทย์เดิมได้ครบ (skill gap ต่ำ + ค่าจ้างดีขึ้น + เสี่ยงลดลง)

### 5.3 Pseudocode เต็ม

```python
# ── เตรียมกราฟ ──────────────────────────────────────────────
def build_transition_graph(occupations, occ_vectors, skill_graph, dist_threshold=0.85):
    """
    สร้าง edge เฉพาะคู่อาชีพที่ระยะห่างทักษะไม่เกิน threshold
    (ตัด edge ที่ไกลเกินไปทิ้ง ลด E ลงมาก ทำให้กราฟไม่ใช่ complete graph O(V^2))
    """
    G = Graph()
    for occ_a, occ_b in all_pairs(occupations):
        dist, shared = occupation_distance(occ_a, occ_b, occ_vectors, skill_graph)
        if dist <= dist_threshold:
            G.add_edge(occ_a, occ_b, skill_distance=dist, shared_skills=shared)
            G.add_edge(occ_b, occ_a, skill_distance=dist, shared_skills=shared)  # undirected
    return G


def normalize_edge_weights(G, risk_scores):
    """min-max normalize ทั่วทั้งกราฟ ก่อนรวมมิติต่างหน่วยกัน (skill_distance เป็น 0-1 อยู่แล้ว,
    risk_score อาจเป็นสเกลอื่น) — ทำครั้งเดียวตอนสร้างกราฟ ไม่ต้องทำซ้ำตอน query"""
    all_dist = [e.skill_distance for e in G.edges]
    dmin, dmax = min(all_dist), max(all_dist)

    for e in G.edges:
        e.dist_norm = (e.skill_distance - dmin) / (dmax - dmin + 1e-9)
        e.risk_norm = risk_scores[e.target]           # risk score ออกแบบให้อยู่ใน [0,1] อยู่แล้วจาก MVP เดิม


def edge_cost(e, alpha, gamma):
    # ทุกเทอม ≥ 0 เสมอ → Dijkstra ถูกต้อง
    return alpha * e.dist_norm + gamma * e.risk_norm


# ── Layer 1: single-source Dijkstra ────────────────────────
def dijkstra_from_source(G, source, alpha, gamma):
    for e in G.edges:
        e.cost = edge_cost(e, alpha, gamma)

    dist = {n: float('inf') for n in G.nodes}
    prev = {n: None for n in G.nodes}
    dist[source] = 0
    visited = set()
    pq = [(0, source)]

    while pq:
        d, u = heappop(pq)
        if u in visited:
            continue
        visited.add(u)

        for e in G.edges_from(u):
            v = e.target
            if v in visited:
                continue
            nd = d + e.cost
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = (u, e)
                heappush(pq, (nd, v))

    return dist, prev     # dist[x] = ต้นทุน skill+risk จาก source ไปอาชีพ x ทุกตัว


def reconstruct_path(prev, source, target):
    path, explanations = [], []
    node = target
    while node != source:
        u, e = prev[node]
        path.append(node)
        explanations.append({
            "from": u, "to": node,
            "shared_skills": e.shared_skills[:5],   # ใช้โชว์ "ทำไมแนะนำ hop นี้"
        })
        node = u
    path.append(source)
    return list(reversed(path)), list(reversed(explanations))


# ── Layer 2: จัดอันดับ target ที่จะแนะนำ ───────────────────
def rank_recommended_targets(source, dist, wage_data, risk_scores, beta, gamma2, top_n=5):
    wage_source = wage_data[source].median
    all_wage_deltas = [wage_data[occ].median - wage_source for occ in dist if occ != source]
    wmin, wmax = min(all_wage_deltas), max(all_wage_deltas)

    scored = []
    for occ, path_cost in dist.items():
        if occ == source or path_cost == float('inf'):
            continue
        wage_delta = wage_data[occ].median - wage_source
        wage_norm = (wage_delta - wmin) / (wmax - wmin + 1e-9)

        # ยิ่ง path_cost ต่ำ ยิ่งดี / ยิ่ง wage_norm สูง ยิ่งดี / ยิ่ง risk ปลายทางต่ำ ยิ่งดี
        score = beta * wage_norm - path_cost - gamma2 * risk_scores[occ]
        scored.append((occ, score, wage_delta, path_cost))

    scored.sort(key=lambda x: -x[1])
    return scored[:top_n]


# ── ผูกทั้งหมดเข้าด้วยกัน ───────────────────────────────────
def recommend_career_paths(source_occ, G, wage_data, risk_scores,
                            alpha=0.6, gamma=0.4, beta=0.5, gamma2=0.3, top_n=5):
    dist, prev = dijkstra_from_source(G, source_occ, alpha, gamma)
    top_targets = rank_recommended_targets(source_occ, dist, wage_data, risk_scores, beta, gamma2, top_n)

    results = []
    for occ, score, wage_delta, path_cost in top_targets:
        path, explanations = reconstruct_path(prev, source_occ, occ)
        results.append({
            "target_occupation": occ,
            "score": score,
            "wage_delta": wage_delta,
            "path": path,
            "path_explanation": explanations,   # skill ที่ overlap ในแต่ละ hop
            "target_risk": risk_scores[occ],
        })
    return results
```

**Complexity:** `normalize_edge_weights` และการสร้างกราฟ = O(V²) ครั้งเดียวตอน build (ทำ offline, cache ไว้) ส่วน `dijkstra_from_source` ต่อ query = O(E log V) ด้วย binary heap — ในสเกล MVP (15–20 อาชีพ) นี่คือ operation ระดับ sub-millisecond แม้ scale ไปถึงหลักร้อยอาชีพ (ISCO ระดับ unit group) ก็ยังเร็วพอสำหรับ real-time demo

### 5.4 ส่วนขยาย: k เส้นทางทางเลือก (ถ้ามีเวลา)

บาง user อาจอยากเห็นมากกว่า 1 เส้นทางไปยัง target เดียวกัน (เช่น เส้นทางเร็วสุด vs เส้นทางที่ skill gap กระจายสม่ำเสมอกว่า) — ใช้ **Yen's algorithm** ต่อยอดจาก Dijkstra ที่มีอยู่แล้วได้เลย เพราะ edge weight เป็น non-negative (เงื่อนไขที่ Yen's ต้องการ):

```python
def k_shortest_paths(G, source, target, k, alpha, gamma):
    A = [dijkstra_shortest_path(G, source, target, alpha, gamma)]  # path แรก = shortest ปกติ
    B = []  # candidate heap

    for i in range(1, k):
        prev_path = A[-1]
        for j in range(len(prev_path) - 1):
            spur_node = prev_path[j]
            root_path = prev_path[:j+1]

            G_copy = G.clone()
            for path in A:
                if path[:j+1] == root_path:
                    G_copy.remove_edge(path[j], path[j+1])
            for node in root_path[:-1]:
                G_copy.remove_node(node)

            spur_path = dijkstra_shortest_path(G_copy, spur_node, target, alpha, gamma)
            if spur_path:
                total_path = root_path[:-1] + spur_path
                if total_path not in B:
                    B.append(total_path)

        if not B:
            break
        B.sort(key=lambda p: path_cost(G, p, alpha, gamma))
        A.append(B.pop(0))

    return A
```

ใช้เป็น "stretch goal" ถ้าเวลาแฮคกาธอนเหลือ ไม่ใช่ requirement ของ MVP

---

## 6. ขั้นที่ 4 — Wage Radar × Centrality

### 6.1 แนวคิด

ตามงานวิจัยฝรั่งเศส อาชีพที่มี centrality สูงในเครือข่าย (เชื่อมกับอาชีพอื่นได้ง่าย เพราะ skill โยกย้ายได้กว้าง) สัมพันธ์กับอำนาจต่อรองและค่าจ้างที่สูงกว่า — ใช้ค่านี้เสริม Wage Radar เดิม: ถ้าคนอยู่ในอาชีพ centrality สูงแต่ค่าจ้างต่ำกว่าที่ควร = สัญญาณว่าโดนกดค่าแรงเทียบกับอำนาจต่อรองจริง ไม่ใช่แค่เทียบค่าเฉลี่ยตลาดเฉยๆ

### 6.2 Pseudocode

```python
def degree_centrality(G):
    # เร็ว ใช้ได้เลยถ้าเวลาไม่พอ
    max_deg = max(len(G.edges_from(n)) for n in G.nodes)
    return {n: len(G.edges_from(n)) / max_deg for n in G.nodes}


def betweenness_centrality_brandes(G):
    """
    Brandes' algorithm — O(VE) แทนที่จะเป็น O(V^3) ของวิธี naive
    ใช้ถ้ามีเวลาพอ ให้ผลแม่นกว่า degree centrality เพราะจับ "อาชีพที่เป็นทางผ่านสำคัญ"
    ได้ ไม่ใช่แค่ "อาชีพที่เชื่อมกับใครเยอะ"
    """
    betweenness = {n: 0.0 for n in G.nodes}
    for s in G.nodes:
        stack = []
        pred = {n: [] for n in G.nodes}
        sigma = {n: 0 for n in G.nodes}; sigma[s] = 1
        d = {n: -1 for n in G.nodes}; d[s] = 0
        queue = deque([s])

        while queue:
            v = queue.popleft()
            stack.append(v)
            for w in G.neighbors(v):
                if d[w] < 0:
                    d[w] = d[v] + 1
                    queue.append(w)
                if d[w] == d[v] + 1:
                    sigma[w] += sigma[v]
                    pred[w].append(v)

        delta = {n: 0 for n in G.nodes}
        while stack:
            w = stack.pop()
            for v in pred[w]:
                delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
            if w != s:
                betweenness[w] += delta[w]

    return normalize(betweenness)


def underpayment_signal(occ, centrality, wage_data, all_occupations):
    """
    ถดถอย wage กับ centrality ทั่วทั้งตลาด เพื่อประมาณ 'ค่าจ้างที่ควรได้' จาก centrality
    แล้วเทียบกับค่าจ้างจริง
    """
    predicted_wage = regression_predict(centrality[occ], centrality, wage_data, all_occupations)
    actual_wage = wage_data[occ].median
    gap = (predicted_wage - actual_wage) / predicted_wage
    return gap   # gap สูง = สัญญาณโดนกดค่าแรงเทียบกับอำนาจต่อรองในเครือข่าย
```

**เวลาไม่พอ:** ใช้ `degree_centrality` แทน Brandes ได้ — คุณภาพลดลงบ้างแต่ implement ใน 10 บรรทัด เทียบกับ Brandes ที่ใช้เวลามากกว่า

---

## 7. Validation Plan

ก่อนเชื่อผลลัพธ์จากกราฟ ต้องเช็ค sanity ด้วยคู่อาชีพที่รู้อยู่แล้วว่าใกล้ทักษะกันจริง เช่น:

| อาชีพต้นทาง | อาชีพเป้าหมายที่คาดว่าใกล้ | เกณฑ์ผ่าน |
|---|---|---|
| Call center | Customer success | skill_distance ต่ำกว่าค่ามัธยฐานของกราฟ |
| ช่างเทคนิคโรงงาน | QA / ควบคุมคุณภาพ | skill_distance ต่ำกว่าค่ามัธยฐาน |
| แคชเชียร์ | ผู้ช่วยฝ่ายขาย/สโตร์ | path 1-2 hop เท่านั้น |
| Data entry | Junior data analyst | มี shared skill ที่ explain ได้ตรงสามัญสำนึก (Excel, data cleaning) |

ถ้ากราฟให้ผลขัดสามัญสำนึกในคู่พื้นฐานเหล่านี้ ให้กลับไปเช็ค canonicalization ของ skill tag ก่อน (สาเหตุที่พบบ่อยสุดคือ skill ชื่อเดียวกันถูกแยกเป็นคนละ node)

---

## 8. ความเสี่ยงและข้อจำกัด (ต้องพูดตรงๆ กับกรรมการ)

1. **Error สะสม (error propagation):** ถ้า LLM สกัด skill tag ผิด ความผิดพลาดไหลต่อเข้ากราฟและกระทบ path-finding ทั้งระบบ ต่างจาก embedding matching ธรรมดาที่ error อยู่แค่จุดเดียว → ต้องมี validation set ตามข้อ 7 ก่อนเชื่อผลลัพธ์อื่น
2. **Proxy ไม่ใช่ของจริง:** กราฟจาก job posting co-occurrence เป็น proxy ของ "ความใกล้เคียงทักษะ" ไม่ใช่ "ความง่ายในการเปลี่ยนงานจริง" แบบงานวิจัยต้นฉบับที่ใช้ transition data — ต้องพูดความต่างนี้ตรงๆ ตอนพรีเซนต์
3. **Cold-start / sparse data:** อาชีพที่มีประกาศงานน้อยจะได้ skill vector ที่ไม่น่าเชื่อถือ (นับตัวอย่างน้อยเกินไป) → ควร fallback ไปใช้ skill vector ของกลุ่มอาชีพที่กว้างกว่า (broader occupation category) เมื่อจำนวนประกาศต่ำกว่า threshold
4. **ซับซ้อนขึ้นจริง:** การสร้างกราฟ + path-finding ใช้เวลาพัฒนามากกว่า embedding matching ธรรมดา — ต้อง scope กราฟให้เล็กลงตาม MVP (ข้อ 9) ไม่ใช่พยายามครอบคลุมทุกอาชีพในไทยตั้งแต่วันแข่ง
5. **Negative-weight bug (แก้แล้ว):** สูตร cost function เดิมมีความเสี่ยงให้ Dijkstra ผิดพลาดแบบเงียบๆ — แก้ด้วยการแยก Layer 1/Layer 2 ตามข้อ 5.2 แล้ว แต่ทีมต้อง implement ตามการแยกนี้ ไม่ใช้สูตรรวมเดิมตรงๆ

---

## 9. ขอบเขต MVP สำหรับแฮคกาธอน

- จำกัดกราฟไว้ที่ **15–20 อาชีพเสี่ยงหลัก** ตามที่วางไว้ใน pipeline เดิม ไม่พยายามสร้างกราฟครบทุกอาชีพในไทย
- ใช้ Dijkstra + `degree_centrality` เป็น baseline ที่ต้องทำให้เสร็จก่อน (must-have)
- Betweenness centrality (Brandes) และ k-shortest paths (Yen's) เป็น stretch goal ถ้าเวลาเหลือ
- เตรียมกราฟ (ขั้นที่ 1–2, offline) ให้เสร็จก่อนวันเดโม ตัว live demo ให้รันแค่ query path-finding (เร็ว, real-time ได้จริง) ไม่ต้อง build กราฟสดหน้างาน
- เตรียม validation set (ข้อ 7) ไว้ล่วงหน้า เพื่อเช็ค sanity ก่อนขึ้นเดโม

---

## 10. สคริปต์เตรียมตอบกรรมการ (คำถามที่คาดว่าจะโดนถาม)

**Q: "นี่คือ embedding matching ที่ห่อด้วยศัพท์ยากๆ หรือเปล่า?"**
A: ไม่ใช่ — ระบบนี้ตอบได้ว่า "ทำไม" สองอาชีพถึงใกล้กัน (ระบุ skill ที่ overlap จริง) ซึ่ง embedding cosine similarity ตอบไม่ได้ เพราะเป็น black box เชิงตัวเลขล้วนๆ

**Q: "ข้อมูลพอไหมที่จะสร้างกราฟที่น่าเชื่อถือ?"**
A: ยอมรับตรงๆ ว่าเป็น proxy จาก job posting ไม่ใช่ transition data จริงแบบงานวิจัยต้นฉบับ — แต่มี validation set เทียบกับสามัญสำนึก (call center → customer success ฯลฯ) เพื่อยืนยันว่ากราฟให้ผลสมเหตุสมผลก่อนเชื่อผลลัพธ์ส่วนอื่น

**Q: "ทำไม cost function ถึงแยกเป็น 2 layer แทนที่จะรวมสูตรเดียว?"**
A: พิสูจน์ได้ทางคณิตศาสตร์ว่าเทอมค่าจ้างในสูตรรวมเดียว telescoping จนไม่มีผลต่อการเลือกเส้นทางเมื่อ target ตายตัว (ดูข้อ 5.1) การแยกทำให้ถูกต้องกว่า เร็วกว่า (Dijkstra รอบเดียวได้ผลลัพธ์ทุก target) และยังคง trade-off ทั้ง 3 มิติไว้ครบ

**Q: "scale ไปทั้งประเทศได้ไหม?"**
A: ได้ในเชิงสถาปัตยกรรม (Dijkstra ที่ E ~ หลักหมื่นยังเร็วระดับมิลลิวินาที) แต่คุณภาพกราฟขึ้นกับปริมาณและความหลากหลายของประกาศงานที่ scrape ได้ — MVP จงใจ scope แคบไว้ก่อนเพื่อควบคุมคุณภาพ

---

*จบเอกสาร — เวอร์ชันนี้แทนที่ `jobshield-ai-spec.md` เดิมทั้งหมด โดยคงเนื้อหาที่มาและความเสี่ยงเดิมไว้ครบ พร้อมเพิ่มรายละเอียดเชิงเทคนิคที่ยังไม่มีในสเปกฉบับแรก*
