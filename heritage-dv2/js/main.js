const charts = {
    "#radial_family_tree": "js/radial_family_tree.vg.json",
    "#map_nhl": "js/map_nhl.vg.json",
    "#map_state": "js/map_state.vg.json",
    "#line_growth": "js/line_growth.vg.json",
    "#chart_state_added": "js/chart_state_added.vg.json",
    "#butterfly_land_sea": "js/butterfly_land_sea.vg.json",
    "#heatmap_qld_sites": "js/heatmap_qld_sites.vg.json",
    "#waffle_protection": "js/waffle_protection.vg.json",
    "#radial_indigenous": "js/radial_indigenous.vg.json",
    "#map_bivariate_heritage": "js/map_bivariate_heritage.vg.json",
    "#funnel_management": "js/funnel_management.vg.json",
    "#marimekko_pressures": "js/marimekko_pressures.vg.json",
    "#spike_wh_threats": "js/spike_wh_threats.vg.json",
    "#timeline_ningaloo": "js/timeline_ningaloo.vg.json",
    "#sankey_grants": "js/sankey_grants.vg.json",
    "#pareto_wh_funding": "js/pareto_wh_funding.vg.json"
};

const views = {};

//load
for (const [id, spec] of Object.entries(charts)) {
    vegaEmbed(id, spec, { actions: false })
        // .then() - run after chart successfully loads
        // result.view - get rendered Vega view
        // store view in views object for later interaction
        .then((result) => { views[id] = result.view; })
        .catch(console.error); // show errors if fails
}

// everything that should fade up as you scroll: chart cards, headings, stats, notes, KPI tiles, bridges
const revealItems = document.querySelectorAll(
    ".chart-card, .number-panel, .notice, .kpi, .chapter-bridge, " +
    "main > section > .section-number, main > section > h2, .chapter-stat, main > section > .intro, .conclusion"
);
// KPI tiles come in one after another
document.querySelectorAll(".kpi").forEach((tile, i) => tile.style.setProperty("--delay", (i * 0.12) + "s"));
// IntersectionObserver - detect when elements enter the screen
const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            // stop observer after first appearance to prevent animation from repeating
            observer.unobserve(entry.target);
        }
    }
}, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }); // trigger when 12% of the element is on screen 

for (const item of revealItems) {
    item.classList.add("reveal");
    observer.observe(item);
}

// Scrollytelling for the Part 02 map: each text step tells the map which view to show
const steps = document.querySelectorAll(".scrolly-step");

const stepObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        // check the active step 
        if (entry.isIntersecting) {
            // remove active from all steps then add to current step
            steps.forEach((step) => step.classList.remove("active"));
            entry.target.classList.add("active"); 

            const mapView = views["#map_nhl"];
            if (mapView) {
                // signal() update the vega signal , run() update to visualization
                mapView.signal("step", Number(entry.target.dataset.step)).run();
            }
        }
    }
}, { rootMargin: "-50% 0px -50% 0px" });

steps.forEach((step) => stepObserver.observe(step));


// Highlight the chapter currently being read in the sticky nav
const storyNavLinks = Array.from(document.querySelectorAll(".story-nav-links a"));
const storySections = storyNavLinks.map(a => document.querySelector(a.getAttribute("href")));
function updateActiveChapter() {
    // the active chapter is the last one whose top is in the upper 40% of the screen
    let active = storySections[0];
    for (const section of storySections) {
        if (section.getBoundingClientRect().top <= window.innerHeight * 0.4) active = section;
    }
    storyNavLinks.forEach(a => {
        const selected = a.getAttribute("href") === "#" + active.id;
        a.classList.toggle("active", selected);
        if (selected) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
}

// Reading progress line under the nav: width = how far down the page you are
const progressBar = document.getElementById("story-progress-bar");
function updateProgress() {
    updateActiveChapter();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
}
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

// ===== Walk to (Part 02 | Idiom 3 per million map) =====
// Each state: where to centre the map, how far to zoom, and its numbers for the info card
const walkStates = {
    ALL: { name: "Australia", lon: 134, lat: -28, zoom: 1, total: 120, pm: 4.3, h: 65, n: 35, i: 20 },
    NSW: { name: "New South Wales", lon: 147.2, lat: -32.6, zoom: 2.7, total: 30, pm: 3.5, h: 18, n: 8, i: 4 },
    VIC: { name: "Victoria", lon: 145.2, lat: -37, zoom: 4.6, total: 29, pm: 4.1, h: 23, n: 2, i: 4 },
    QLD: { name: "Queensland", lon: 145, lat: -20.5, zoom: 1.75, total: 12, pm: 2.1, h: 2, n: 7, i: 3 },
    WA:  { name: "Western Australia", lon: 122.5, lat: -25.5, zoom: 1.6, total: 16, pm: 5.2, h: 4, n: 9, i: 3 },
    SA:  { name: "South Australia", lon: 135.5, lat: -32, zoom: 2.3, total: 10, pm: 5.2, h: 5, n: 4, i: 1 },
    TAS: { name: "Tasmania", lon: 146.6, lat: -42, zoom: 7, total: 13, pm: 22.4, h: 9, n: 2, i: 2 },
    NT:  { name: "Northern Territory", lon: 133.4, lat: -19.3, zoom: 2.1, total: 6, pm: 22.3, h: 0, n: 3, i: 3 },
    ACT: { name: "Australian Capital Territory", lon: 149.0, lat: -35.5, zoom: 26, total: 4, pm: 8.2, h: 4, n: 0, i: 0 }
};
const walkChips = document.querySelectorAll(".walk-chip");
const walkCard = document.getElementById("walk-card");
let walkAnimation = null;

// info card: big per million number + a small bar split by heritage type
function updateWalkCard(code) {
    const s = walkStates[code];
    const seg = (n, cls) => n ? `<span class="${cls}" style="flex:${n}" title="${n}"></span>` : "";
    walkCard.innerHTML = `
        <span class="walk-card-kicker">${code === "ALL" ? "National average" : "Now viewing"}</span>
        <strong class="walk-card-name">${s.name}</strong>
        <span class="walk-card-big">${s.pm}<small> places per million</small></span>
        <span class="walk-card-bar">${seg(s.h, "seg-h")}${seg(s.n, "seg-n")}${seg(s.i, "seg-i")}</span>
        <span class="walk-card-key">${s.total} places: ${s.h} historic, ${s.n} natural, ${s.i} Indigenous</span>`;
}

// "walk" to a state: animate the zoom and centre signals over 1.6 s
function walkTo(code) {
    const view = views["#map_state"];
    if (!view || !walkStates[code]) return;
    const target = walkStates[code];
    const start = { lon: view.signal("focus_lon"), lat: view.signal("focus_lat"), zoom: view.signal("zoom") };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 1600; // a slower, walking pace
    const t0 = performance.now();
    const ease = t => -(Math.cos(Math.PI * t) - 1) / 2; // gentle start and stop
    view.signal("walk_state", code);
    cancelAnimationFrame(walkAnimation);
    function frame(now) {
        const t = duration ? Math.min((now - t0) / duration, 1) : 1;
        const k = ease(t);
        view.signal("focus_lon", start.lon + (target.lon - start.lon) * k)
            .signal("focus_lat", start.lat + (target.lat - start.lat) * k)
            // zoom in log space so big zooms (ACT) still feel smooth
            .signal("zoom", Math.exp(Math.log(start.zoom) + (Math.log(target.zoom) - Math.log(start.zoom)) * k))
            .run();
        if (t < 1) walkAnimation = requestAnimationFrame(frame);
    }
    walkAnimation = requestAnimationFrame(frame);
    walkChips.forEach(c => {
        const on = c.dataset.state === code;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", on);
    });
    updateWalkCard(code);
}

walkChips.forEach(c => c.addEventListener("click", () => walkTo(c.dataset.state)));
if (walkCard) updateWalkCard("ALL");

// clicking a state on the map walks there too; clicking the same state again walks back out
function hookMapClicks() {
    const view = views["#map_state"];
    if (!view) return setTimeout(hookMapClicks, 300);
    view.addEventListener("click", (event, item) => {
        const code = item && item.datum && item.datum.state;
        if (!code || !walkStates[code]) return;
        walkTo(view.signal("walk_state") === code ? "ALL" : code);
    });
}
hookMapClicks();
