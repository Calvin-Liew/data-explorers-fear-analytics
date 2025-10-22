/* heartbeat.js — v10 (ECG phase • sparse & straight • continuous)
   - 大尺寸（默认 340px 宽）+ 自动贴近 #viz-container 左缘
   - 从 y=0 就开始心跳波（非直线）
   - 单一路径（只有一次 M），stroke-dasharray 不会在段间重置
   - 段与段之间用“下一段的参数”平滑过渡，无折返
   - 波形为 P-Q-R-S-T 相位模型
   - 进度 = lengthAtY(focusY)，跨段不重算
   依赖：d3.v7
*/
(function () {
    const VERSION = 'v10';
    const DEBUG = false;

    /* ==================== 可调参数 ==================== */
    const PANEL_WIDTH = 340;  // ← 和 CSS 的 #heartbeat-container width 一致
    const GAP_PX      = -50;    // ← 与内容左缘的间距（越小越贴近）
    const START_STYLE = 'rise'; // 顶部 0~第一段的波形风格：'calm'|'rise'|'peak'|'resolve'

    // 更稀疏、更直的参数（密度↓ 倾斜=0 抖动↓）
    const ECG_PRESETS = {
        calm: {
            A: 400, cycle: 200, step: 3, tilt: 0.0, jitter: 0.25,
            Ap: .20, Aq: .16, Ar: 0.95, As: .40, At: .36
        },
        rise: {
            A: 300, cycle: 200, step: 3, tilt: 0.0, jitter: 0.25,
            Ap: .22, Aq: .18, Ar: 1.05, As: .45, At: .38
        },
        peak: {
            A: 400, cycle: 200, step: 3, tilt: 0.0, jitter: 0.28,
            Ap: .22, Aq: .18, Ar: 1.22, As: .48, At: .40
        },
        resolve: {
            A: 200, cycle: 200, step: 3, tilt: 0.0, jitter: 0.25,
            Ap: .20, Aq: .16, Ar: 0.98, As: .42, At: .38
        },
    };
    /* ================================================= */

    const X_CENTER = Math.round(PANEL_WIDTH / 2);
    const SVG_ID = 'heartbeat-svg';
    const SEL_SECTION = '.viz-section';

    let SCROLL_ROOT = pickScrollRoot();
    let svg, path, marker, totalLen = 0;
    let sections = [];
    let built = false, ticking = false;

    const log = (...a)=> DEBUG && console.log('[heartbeat]', ...a);
    const clamp  = (v,min,max)=> Math.max(min, Math.min(max, v));

    function pickScrollRoot() {
        const list = [
            document.querySelector('#viz-container'),
            document.querySelector('.page'),
            document.querySelector('.content'),
            document.scrollingElement,
            document.documentElement,
            document.body
        ].filter(Boolean);
        for (const el of list) {
            const cs = getComputedStyle(el);
            const canScroll =
                (el.scrollHeight - el.clientHeight) > 2 &&
                (/(auto|scroll)/i.test(cs.overflowY) || el === document.scrollingElement);
            if (canScroll) return el;
        }
        return document.scrollingElement || document.documentElement;
    }
    const getScrollTop = ()=> ('scrollTop' in SCROLL_ROOT) ? SCROLL_ROOT.scrollTop : (window.scrollY || 0);

    function inferStyle(el){
        const id = (el?.id || '').toLowerCase();
        if (el?.dataset?.ecg) return el.dataset.ecg;
        if (id.includes('signals')) return 'calm';
        if (id.includes('journey') || id.includes('fear')) return 'rise';
        if (id.includes('peaks')) return 'peak';
        if (id.includes('effect')) return 'resolve';
        return 'calm';
    }

    /* ---------- 相位模型的段内折线：只返回 L... 片段（不含 M） ---------- */
    function buildSegmentPolylineL(x0, y0, y1, preset){
        const {
            A, cycle = 78, step = 3, tilt = 0.0, jitter = 0.25,
            Ap = .20, Aq = .16, Ar = 1.00, As = .45, At = .38
        } = preset;

        const out = [];
        const s = (t)=> t*t*(3-2*t);

        // 相位（0..1）→ 横向偏移（右为正）
        function phaseOffset(ph){
            let x = 0;
            if (ph < 0.14){                   // P: 小而圆
                x += A * Ap * Math.sin(Math.PI * (ph/0.14));
            } else if (ph >= 0.22 && ph < 0.26){ // Q: 向左短促下挫
                const t = (ph - 0.22) / 0.04;
                x -= A * Aq * s(t);
            } else if (ph >= 0.26 && ph < 0.30){ // R: 尖、短、向右刺
                const t = (ph - 0.26) / 0.04;      // 0→1
                x += A * Ar * (1 - t);             // 快升快落
            } else if (ph >= 0.30 && ph < 0.35){ // S: 快速左过冲
                const t = (ph - 0.30) / 0.05;
                x -= A * As * (t<0.5 ? 2*t : 2*(1-t));
            } else if (ph >= 0.66 && ph < 0.90){ // T: 宽圆右凸
                const t = (ph - 0.66) / 0.24;
                x += A * At * Math.sin(Math.PI * t);
            }
            return x;
        }

        let y = y0;
        while (y <= y1) {
            const dy = y - y0;
            const ph = ((dy % cycle) / cycle);        // 0..1
            let x = x0 + phaseOffset(ph);

            // （本配置已 tilt=0，不倾斜；如要轻微倾斜可给一个 -0.03 ~ 0.03 的值）
            x += dy * tilt;

            // 轻微随机，去掉“过于规则的栅栏感”
            x += (Math.random() - 0.5) * jitter;

            out.push(`L ${x.toFixed(2)},${y.toFixed(2)}`);
            y += step;
        }
        return out.join(' ');
    }

    /* ---------- 根据滚动根，计算各段在文档坐标中的范围 ---------- */
    function selectSections(){
        const rootTop = SCROLL_ROOT.getBoundingClientRect
            ? SCROLL_ROOT.getBoundingClientRect().top : 0;
        const base = getScrollTop();
        let list = Array.from(document.querySelectorAll(SEL_SECTION));
        if (!list.length) {
            const fb = document.getElementById('viz-container') || document.body;
            const r = fb.getBoundingClientRect();
            const top = r.top - rootTop + base, bottom = top + r.height;
            return [{ top, bottom, y0: top+40, y1: bottom-40, style: 'rise' }];
        }
        return list.map(el=>{
            const r = el.getBoundingClientRect();
            const top = r.top - rootTop + base, bottom = top + r.height;
            const pad = Math.min(80, r.height*0.08);
            return { top, bottom, y0: top+pad, y1: bottom-pad, style: inferStyle(el) };
        });
    }

    /* ---------- 让心跳贴近内容左缘 ---------- */
    function placeHeartbeat(){
        const box  = document.getElementById('heartbeat-container');
        const main = document.getElementById('viz-container');
        if (!box || !main) return;
        const rect = main.getBoundingClientRect();
        const left = Math.max(6, rect.left - box.clientWidth - GAP_PX);
        box.style.left = left + 'px';
    }

    /* ---------- 构建整条连续路径（只有一次 M；从 y=0 就开始） ---------- */
    function buildSVG(){
        const el = document.getElementById(SVG_ID);
        if (!el || !window.d3) return;

        const docH = Math.max(
            SCROLL_ROOT.scrollHeight || 0,
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );

        svg = d3.select('#'+SVG_ID)
            .attr('width', PANEL_WIDTH)
            .attr('height', docH)
            .attr('viewBox', `0 0 ${PANEL_WIDTH} ${docH}`);

        sections = selectSections();

        const dParts = [];
        // 只开一次 M；从 y=0 起就按 START_STYLE 画心跳
        dParts.push(`M ${X_CENTER},0`);
        const firstY0 = sections.length ? sections[0].y0 : docH;
        dParts.push(buildSegmentPolylineL(X_CENTER, 0, firstY0, ECG_PRESETS[START_STYLE] || ECG_PRESETS.rise));

        // 每段心跳 + 段与段的“平滑过渡”（用下一段参数生成）
        sections.forEach((s, i)=>{
            const preset = ECG_PRESETS[s.style] || ECG_PRESETS.calm;
            dParts.push(buildSegmentPolylineL(X_CENTER, s.y0, s.y1, preset));

            const nextY0 = (i < sections.length-1) ? sections[i+1].y0 : null;
            if (nextY0 != null) {
                const nextPreset = ECG_PRESETS[sections[i+1].style] || ECG_PRESETS.calm;
                dParts.push(buildSegmentPolylineL(X_CENTER, s.y1, nextY0, nextPreset)); // 平滑衔接
            } else {
                dParts.push(`L ${X_CENTER},${docH}`); // 收尾到页面底
            }
        });

        if (path) path.remove();
        path = svg.append('path')
            .attr('d', dParts.join(' '))
            .attr('stroke', '#ff3344')
            .attr('stroke-width', 9)   // 粗一点，配合大尺寸
            .attr('fill', 'none')
            .style('filter','drop-shadow(0 0 18px rgba(255,51,68,.8))');

        totalLen = path.node().getTotalLength();
        const dash = `${totalLen} ${totalLen}`;
        path.attr('stroke-dasharray', dash).attr('stroke-dashoffset', totalLen);

        if (marker) marker.remove();
        marker = svg.append('circle')
            .attr('r', 10)
            .attr('fill', '#ff3344')
            .style('filter','drop-shadow(0 0 18px rgba(255,51,68,.98))');

        built = true;
        placeHeartbeat();
        update();
    }

    /* ---------- y → 路径长度 的全局映射：保证跨段连续 ---------- */
    function lengthAtY(targetY){
        const node = path.node();
        const total = totalLen;
        let lo=0, hi=total, best=0, diffBest=1e9;
        for(let i=0;i<24;i++){
            const mid=(lo+hi)/2, p=node.getPointAtLength(mid), d=Math.abs(p.y-targetY);
            if (d<diffBest){best=mid; diffBest=d;}
            if (p.y<targetY) lo=mid; else hi=mid;
        }
        return best;
    }

    /* ---------- 滚动时点亮（全局连续） ---------- */
    function update(){
        if (!built || !path) return;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(()=>{
            const viewH = SCROLL_ROOT.clientHeight || window.innerHeight;
            const focusY = getScrollTop() + viewH * 0.38;
            const maxY = path.node().getPointAtLength(totalLen).y;
            const y = clamp(focusY, 0, maxY);
            const lit = lengthAtY(y);
            path.attr('stroke-dashoffset', totalLen - lit);
            const p = path.node().getPointAtLength(lit);
            marker.attr('cx', p.x).attr('cy', p.y);
            ticking=false;
        });
    }

    function attachListeners(){
        try{
            SCROLL_ROOT.removeEventListener?.('scroll', update);
            window.removeEventListener?.('scroll', update);
        }catch(e){}
        SCROLL_ROOT = pickScrollRoot();
        SCROLL_ROOT.addEventListener('scroll', update, {passive:true});
        window.addEventListener('scroll', update, {passive:true});
        window.addEventListener('resize', ()=>{ placeHeartbeat(); buildSVG(); attachListeners(); });
    }

    window.addEventListener('load',   ()=>{ placeHeartbeat(); buildSVG(); attachListeners(); });
    document.addEventListener('DOMContentLoaded', ()=>{ placeHeartbeat(); buildSVG(); attachListeners(); });
})();
