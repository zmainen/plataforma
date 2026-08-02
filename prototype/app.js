/* Plataforma prototype — the artist app.
 * Vanilla JS, no dependencies, no backend. State persists in localStorage so the
 * confirm / edit / add / publish actions genuinely stick across reloads.
 * Views: claim -> discover -> review -> catalogue -> pod -> public.
 */
(function () {
  "use strict";
  var SEED = window.PLATAFORMA_SEED;
  var LS_KEY = "plataforma-proto-v1";

  /* ------------------------------------------------------------------ state */
  function initialState() {
    return { started: false, discovered: false, reviewed: {}, edits: {},
             added: [], published: {}, podInvites: {} };
  }
  var state = load();
  function load() {
    try { return Object.assign(initialState(), JSON.parse(localStorage.getItem(LS_KEY)) || {}); }
    catch (e) { return initialState(); }
  }
  function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  function resetDemo() { state = initialState(); save(); location.hash = "#/"; render(); toast("Demo reset"); }

  /* ---------------------------------------------------------------- helpers */
  function esc(s) {
    return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function el(html) {
    var t = document.createElement("template"); t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
  }
  function seedCandidates() { return SEED.candidates.slice(); }
  function allCandidates() { return SEED.candidates.concat(state.added); }
  function baseCandidate(id) {
    return SEED.candidates.find(function (x) { return x.id === id; }) ||
           state.added.find(function (x) { return x.id === id; }) || null;
  }
  function candidate(id) {
    var b = baseCandidate(id); if (!b) return null;
    var e = state.edits[id]; return e ? Object.assign({}, b, e) : b;
  }
  function reviewableCount() { return allCandidates().filter(function (c) { return c.issue !== "false-positive-hidden"; }).length; }
  function reviewedCount() { return allCandidates().filter(function (c) { return state.reviewed[c.id]; }).length; }
  function confirmedList() {
    return allCandidates()
      .filter(function (c) { return state.reviewed[c.id] === "confirmed"; })
      .map(function (c) { return candidate(c.id); });
  }
  function isPublished(id) { return state.published[id] !== false; } // default public once confirmed
  function sourceLabel(id) { var s = SEED.sources.find(function (x) { return x.id === id; }); return s ? s.label : id; }
  function glyphFor(c) {
    var perf = (c.modules || []).indexOf("performance") >= 0;
    return { cls: perf ? "perf" : "", ch: perf ? "◭" : (c.title ? c.title[0] : "◻") };
  }
  // A source pill links out to its real record when the source carries a URL.
  function sourcePill(sid) {
    var s = SEED.sources.find(function (x) { return x.id === sid; });
    var label = s ? s.label : sid;
    if (s && s.url) {
      return '<a class="pill src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(label) + ' ↗</a>';
    }
    return '<span class="pill">' + esc(label) + '</span>';
  }
  // Expandable detail built only from fields that actually exist on the record.
  function detailsHtml(c) {
    var rows = [];
    if (c.duration) rows.push('<div class="d-row"><span class="d-k">Duration</span><span>' + esc(c.duration) + '</span></div>');
    if (c.collection && c.collection.holder) rows.push('<div class="d-row"><span class="d-k">Collection</span><span>' + esc(c.collection.holder) + '</span></div>');
    if (c.realisations && c.realisations.length) {
      var rs = c.realisations.map(function (r) {
        var v = (r.venues && r.venues.length) ? ' — ' + esc(r.venues.join(", ")) : "";
        return '<li>' + esc(r.type) + ': <b>' + esc(r.title) + '</b>' + (r.dateRange ? ' · ' + esc(r.dateRange) : "") + v + '</li>';
      }).join("");
      rows.push('<div class="d-row"><span class="d-k">Realisations</span><ul class="d-list">' + rs + '</ul></div>');
    }
    if (c.commissioners && c.commissioners.length) rows.push('<div class="d-row"><span class="d-k">Commissioned by</span><span>' + esc(c.commissioners.join(", ")) + '</span></div>');
    if (c.funders && c.funders.length) rows.push('<div class="d-row"><span class="d-k">Funders</span><span>' + esc(c.funders.join(", ")) + '</span></div>');
    return rows.join("");
  }
  function attachDetails(cardNode, c) {
    var body = detailsHtml(c);
    if (!body) return;
    var toggle = el('<button class="details-toggle" aria-expanded="false">▸ More details</button>');
    var panel = el('<div class="wdetails" hidden>' + body + '</div>');
    toggle.addEventListener("click", function () {
      if (panel.hasAttribute("hidden")) {
        panel.removeAttribute("hidden"); toggle.textContent = "▾ Fewer details"; toggle.setAttribute("aria-expanded", "true");
      } else {
        panel.setAttribute("hidden", ""); toggle.textContent = "▸ More details"; toggle.setAttribute("aria-expanded", "false");
      }
    });
    cardNode.appendChild(toggle);
    cardNode.appendChild(panel);
  }

  /* ------------------------------------------------------------------ steps */
  var STEPS = [
    { key: "", lbl: "Claim" },
    { key: "discover", lbl: "Discover" },
    { key: "review", lbl: "Review" },
    { key: "catalogue", lbl: "Catalogue" },
    { key: "pod", lbl: "Pod" },
    { key: "public", lbl: "Public page" }
  ];
  function stepDone(key) {
    if (key === "") return state.started;
    if (key === "discover") return state.discovered;
    if (key === "review") return reviewedCount() >= reviewableCount() && reviewedCount() > 0;
    if (key === "catalogue") return confirmedList().length > 0;
    return false;
  }
  function renderSteps(active) {
    return '<nav class="steps">' + STEPS.map(function (s) {
      var cls = "step" + (s.key === active ? " active" : "") + (stepDone(s.key) ? " done" : "");
      return '<a class="' + cls + '" href="#/' + s.key + '"><span class="lbl">' + esc(s.lbl) + "</span></a>";
    }).join("") + "</nav>";
  }

  /* ------------------------------------------------------------------ router */
  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/");
    return { name: parts[0] || "", arg: parts[1] || "" };
  }
  function render() {
    var r = currentRoute();
    var main = document.getElementById("view");
    var header = document.getElementById("steps-slot");
    var fn = { "": viewClaim, "discover": viewDiscover, "review": viewReview,
               "catalogue": viewCatalogue, "pod": viewPod, "public": viewPublic }[r.name] || viewClaim;
    header.innerHTML = renderSteps(r.name);
    main.innerHTML = "";
    main.appendChild(fn(r.arg));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  /* ============================================================== VIEW: claim */
  function viewClaim() {
    state.started = true; save();
    var a = SEED.artist;
    var node = el('<div class="view claim"></div>');
    node.innerHTML =
      '<div class="eyebrow">Sweat Variant Pod · artist-led</div>' +
      '<div class="lede">Let’s build your catalogue.</div>' +
      '<p>Plataforma is a cooperative directory that artists own. First, we’ll find what’s ' +
      'already out there about your work — so you start by confirming, not typing from a blank page.</p>' +
      '<div class="identity-card">' +
        '<div class="avatar">' + initials(a.name) + '</div>' +
        '<div><div class="who">' + esc(a.name) + '</div>' +
        '<div class="meta">' + esc(a.bio) + '</div>' +
        '<div class="meta">Practice: <b>' + esc(a.practice.name) + '</b> · ' +
          esc(a.practice.members.map(function (m) { return m.name; }).join(" + ")) + '</div></div>' +
      '</div>' +
      '<p class="invite-note">Is this you?</p>' +
      '<div class="btn-row" style="justify-content:center">' +
        '<a class="btn primary big" href="#/discover">Yes — find my work</a>' +
      '</div>';
    return node;
  }

  /* =========================================================== VIEW: discover */
  function viewDiscover() {
    var node = el('<div class="view"></div>');
    node.appendChild(el(
      '<div class="view-head"><div class="eyebrow">Step 1 · Discovery</div>' +
      '<h1>Searching your sources…</h1>' +
      '<p>Plataforma looks where <em>your</em> record actually lives — your site, ' +
      'open data, the collections that hold your work, and the press.</p></div>'));

    var tiles = el('<div class="sources"></div>');
    SEED.sources.forEach(function (s) {
      tiles.appendChild(el(
        '<div class="source-tile" data-src="' + s.id + '">' +
          '<div class="s-label">' + esc(s.label) + '</div>' +
          '<div class="s-kind">' + esc(s.kind) + ' · ' + esc(s.via) + '</div>' +
          '<div class="s-status"><span class="spinner"></span> searching…</div>' +
        '</div>'));
    });
    node.appendChild(tiles);

    var result = el('<div id="disc-result"></div>');
    node.appendChild(result);

    // Animate source-by-source, then reveal the found set.
    var perSource = {};
    allCandidates().forEach(function (c) {
      (c.sources || []).forEach(function (sid) { perSource[sid] = (perSource[sid] || 0) + 1; });
    });
    var order = SEED.sources.map(function (s) { return s.id; });
    var already = state.discovered;
    order.forEach(function (sid, i) {
      var delay = already ? 0 : 350 + i * 480;
      setTimeout(function () {
        var tile = tiles.querySelector('[data-src="' + sid + '"] .s-status');
        if (tile) tile.innerHTML = '<span class="tick">✓</span> found <span class="count-found">' +
          (perSource[sid] || 0) + '</span>';
      }, delay);
    });
    setTimeout(function () {
      state.discovered = true; save();
      renderFound(result);
    }, already ? 0 : 350 + order.length * 480 + 250);

    return node;
  }
  function renderFound(container) {
    var cands = allCandidates();
    var n = cands.length;
    container.innerHTML = "";
    container.appendChild(el(
      '<div class="found-banner"><span class="big-n">We found ' + n + ' works</span> ' +
      'across ' + SEED.sources.length + ' sources, already attributed to you. ' +
      'Some are spot-on; a few need your eye. Nothing is added until <b>you</b> confirm it.</div>'));
    var list = el('<div class="cards"></div>');
    cands.forEach(function (c) { list.appendChild(previewCard(c)); });
    container.appendChild(list);
    container.appendChild(el('<div class="btn-row"><a class="btn primary big" href="#/review">Review & confirm →</a></div>'));
  }
  function previewCard(c) {
    var g = glyphFor(c);
    var srcs = (c.sources || []).map(sourcePill).join("");
    var node = el(
      '<div class="wcard"><div class="wcard-main">' +
        '<div class="glyph ' + g.cls + '">' + esc(g.ch) + '</div>' +
        '<div class="info"><div class="wtitle">' + esc(c.title) + '</div>' +
          '<div class="wsub">' + esc(c.year || "") + (c.disciplines ? ' · ' + esc(c.disciplines.join(", ")) : "") + '</div>' +
          '<div class="src-row">' + srcs +
            '<span class="pill conf">confidence ' + Math.round((c.confidence || 0.5) * 100) + '%</span>' +
          '</div>' +
        '</div>' +
      '</div></div>');
    attachDetails(node, c);
    return node;
  }

  /* ============================================================= VIEW: review */
  function viewReview() {
    var node = el('<div class="view"></div>');
    node.appendChild(el(
      '<div class="view-head"><div class="eyebrow">Step 2 · Confirm, correct, add</div>' +
      '<h1>Your catalogue, your call.</h1>' +
      '<p>Confirm what’s right, fix what isn’t, reject what isn’t yours, and add anything we missed. ' +
      'Judgment stays with you — not the algorithm.</p></div>'));

    var done = reviewedCount(), total = reviewableCount();
    node.appendChild(el(
      '<div class="progress"><span class="mono">' + done + ' / ' + total + ' reviewed</span>' +
      '<span class="bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></span>' +
      (done >= total && total > 0 ? '<a class="btn primary" href="#/catalogue">See catalogue →</a>' : '') +
      '</div>'));

    var list = el('<div class="cards"></div>');
    allCandidates().forEach(function (c) { list.appendChild(reviewCard(c.id)); });
    node.appendChild(list);
    node.appendChild(el('<div class="btn-row"><button class="btn ghost" id="add-work">+ Add a work we missed</button></div>'));
    node.querySelector("#add-work").addEventListener("click", function () { openAddForm(node); });
    return node;
  }

  function reviewCard(id) {
    var c = candidate(id);
    var st = state.reviewed[id];
    var g = glyphFor(c);
    var wrap = el('<div class="wcard' + (st ? " resolved" : "") + (c.issue && !st ? " flag-issue" : "") + '"></div>');

    var srcs = (c.sources || []).map(sourcePill).join("");
    var statusTag = st ? '<span class="status-tag ' + st + '">' + st + "</span>" : "";
    var main = el(
      '<div class="wcard-main">' +
        '<div class="glyph ' + g.cls + '">' + esc(g.ch) + '</div>' +
        '<div class="info">' +
          '<div class="wtitle">' + esc(c.title) + " " + statusTag + '</div>' +
          '<div class="wsub">' + esc(c.year || "") + (c.disciplines ? ' · ' + esc(c.disciplines.join(", ")) : "") +
             (c.coAuthors ? ' · ' + esc(c.coAuthors.map(function (a) { return a.name; }).join(" + ")) : "") + '</div>' +
          (c.description ? '<div class="wdesc">' + esc(c.description) + '</div>' : "") +
          '<div class="src-row">' + srcs + '<span class="pill conf">confidence ' + Math.round((c.confidence || .5) * 100) + '%</span></div>' +
        '</div>' +
      '</div>');
    wrap.appendChild(main);

    if (c.issue && !st) {
      wrap.appendChild(el('<div class="issue-note"><span class="ico">!</span><span>' + esc(c.issueNote || "") + "</span></div>"));
    }

    var actions = el('<div class="wcard-actions"></div>');
    if (st) {
      actions.appendChild(mkBtn("act undo", "↺ Undo", function () { delete state.reviewed[id]; save(); render(); }));
    } else {
      if (c.issue === "duplicate") {
        actions.appendChild(mkBtn("act merge", "⇄ Merge into “" + esc(candidate(c.issueOf).title) + "”", function () {
          state.reviewed[id] = "merged"; save(); render(); toast("Merged as a version");
        }));
        actions.appendChild(mkBtn("act confirm", "Keep as its own work", function () { confirm(id); }));
      } else if (c.issue === "needs-fix") {
        actions.appendChild(mkBtn("act fix", "✓ Apply fix & confirm", function () {
          var fx = baseCandidate(id).fix || {};
          var patch = {};
          if (fx.field && fx.suggested) patch[fx.field] = fx.suggested;
          if (fx.addCoAuthor) patch.coAuthors = (c.coAuthors || []).concat([fx.addCoAuthor]);
          state.edits[id] = Object.assign({}, state.edits[id], patch);
          confirm(id); toast("Fixed & confirmed");
        }));
        actions.appendChild(mkBtn("act", "✎ Edit myself", function () { toggleEdit(wrap, id); }));
      } else if (c.issue === "false-positive") {
        actions.appendChild(mkBtn("act reject", "✕ Not mine — that’s " + esc(c.notMineName), function () {
          state.reviewed[id] = "rejected"; save(); render(); toast("Rejected");
        }));
        actions.appendChild(mkBtn("act", "Actually, keep it", function () { confirm(id); }));
      } else {
        actions.appendChild(mkBtn("act confirm", "✓ Confirm", function () { confirm(id); }));
        actions.appendChild(mkBtn("act", "✎ Edit", function () { toggleEdit(wrap, id); }));
        actions.appendChild(mkBtn("act reject", "Not mine", function () { state.reviewed[id] = "rejected"; save(); render(); }));
      }
    }
    wrap.appendChild(actions);
    attachDetails(wrap, c);
    return wrap;
  }

  function confirm(id) { state.reviewed[id] = "confirmed"; if (state.published[id] === undefined) state.published[id] = true; save(); render(); toast("Confirmed — added to your catalogue"); }

  function mkBtn(cls, label, fn) { var b = el('<button class="' + cls + '">' + label + "</button>"); b.addEventListener("click", fn); return b; }

  function toggleEdit(wrap, id) {
    var existing = wrap.querySelector(".edit-form");
    if (existing) { existing.remove(); return; }
    var c = candidate(id);
    var form = el(
      '<div class="edit-form"><h4>Edit record</h4>' +
        '<div class="field"><label>Title</label><input id="f-title" value="' + esc(c.title) + '"></div>' +
        '<div class="field two"><div><label>Year</label><input id="f-year" value="' + esc(c.year || "") + '"></div>' +
          '<div><label>Co-authors (comma-separated)</label><input id="f-auth" value="' +
            esc((c.coAuthors || []).map(function (a) { return a.name; }).join(", ")) + '"></div></div>' +
        '<div class="field"><label>Description</label><textarea id="f-desc">' + esc(c.description || "") + '</textarea></div>' +
        '<div class="btn-row" style="margin-top:6px"><button class="btn primary" id="f-save">Save & confirm</button>' +
          '<button class="btn ghost" id="f-cancel">Cancel</button></div>' +
      '</div>');
    form.querySelector("#f-cancel").addEventListener("click", function () { form.remove(); });
    form.querySelector("#f-save").addEventListener("click", function () {
      var auth = form.querySelector("#f-auth").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
        .map(function (n) { return { name: n, role: "" }; });
      state.edits[id] = Object.assign({}, state.edits[id], {
        title: form.querySelector("#f-title").value,
        year: form.querySelector("#f-year").value,
        description: form.querySelector("#f-desc").value,
        coAuthors: auth
      });
      confirm(id);
    });
    wrap.appendChild(form);
  }

  function openAddForm(node) {
    var existing = node.querySelector(".edit-form.add");
    if (existing) { existing.scrollIntoView(); return; }
    var form = el(
      '<div class="edit-form add"><h4>Add a work</h4>' +
        '<div class="field"><label>Title</label><input id="a-title" placeholder="Untitled work"></div>' +
        '<div class="field two"><div><label>Year</label><input id="a-year" placeholder="2020"></div>' +
          '<div><label>Discipline</label><input id="a-disc" placeholder="performance"></div></div>' +
        '<div class="field"><label>Description</label><textarea id="a-desc"></textarea></div>' +
        '<div class="btn-row" style="margin-top:6px"><button class="btn primary" id="a-save">Add to catalogue</button></div>' +
      '</div>');
    form.querySelector("#a-save").addEventListener("click", function () {
      var title = form.querySelector("#a-title").value.trim(); if (!title) { toast("Give it a title"); return; }
      var disc = form.querySelector("#a-disc").value.trim();
      var id = "w-added-" + (state.added.length + 1);
      state.added.push({ id: id, title: title, year: form.querySelector("#a-year").value.trim(),
        disciplines: disc ? [disc] : [], modules: /perf|danc|theat/i.test(disc) ? ["performance"] : ["object"],
        sources: ["manual"], confidence: 1, description: form.querySelector("#a-desc").value.trim(),
        addedByArtist: true });
      state.reviewed[id] = "confirmed"; state.published[id] = true; save(); render(); toast("Added");
    });
    node.appendChild(form);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ========================================================== VIEW: catalogue */
  function viewCatalogue() {
    var node = el('<div class="view"></div>');
    var works = confirmedList();
    node.appendChild(el(
      '<div class="view-head"><div class="eyebrow">Step 3 · Yours to keep</div>' +
      '<h1>Your catalogue</h1>' +
      '<p>' + works.length + ' confirmed work' + (works.length === 1 ? "" : "s") + '. ' +
      'Toggle each between draft and public. Export everything, anytime — no lock-in. ' +
      'Plataforma is the custodian; you are the owner.</p></div>'));

    if (!works.length) {
      node.appendChild(el('<div class="empty-state">Nothing confirmed yet. <a href="#/review">Review your discovered works →</a></div>'));
      return node;
    }

    var pub = works.filter(function (w) { return isPublished(w.id); }).length;
    node.appendChild(el('<div class="progress"><span>' + pub + ' public · ' + (works.length - pub) +
      ' draft</span><span class="spacer"></span></div>'));

    works.forEach(function (w) {
      var g = glyphFor(w);
      var on = isPublished(w.id);
      var row = el(
        '<div class="cat-row">' +
          '<div class="glyph">' + esc(g.ch) + '</div>' +
          '<div><div class="ctitle">' + esc(w.title) + (w.addedByArtist ? ' <span class="pill disc">added by you</span>' : "") + '</div>' +
            '<div class="cmeta">' + esc(w.year || "") + (w.disciplines ? ' · ' + esc(w.disciplines.join(", ")) : "") + '</div></div>' +
          '<div class="spacer"></div>' +
          '<div class="toggle" role="button" tabindex="0"><span>' + (on ? "Public" : "Draft") +
            '</span><span class="switch ' + (on ? "on" : "") + '"></span></div>' +
        '</div>');
      var tog = row.querySelector(".toggle");
      tog.addEventListener("click", function () { state.published[w.id] = !isPublished(w.id); save(); render(); });
      node.appendChild(row);
    });

    var mergedNotes = allCandidates().filter(function (c) { return state.reviewed[c.id] === "merged"; });
    if (mergedNotes.length) {
      node.appendChild(el('<div class="cmeta" style="margin:14px 4px;color:var(--faint)">Folded in as versions: ' +
        mergedNotes.map(function (c) { return esc(candidate(c.id).title); }).join(", ") + '.</div>'));
    }

    node.appendChild(el('<div class="btn-row"><button class="btn" id="export">↓ Export my catalogue (JSON)</button>' +
      '<a class="btn primary" href="#/public/okwui">View my public page →</a></div>'));
    node.querySelector("#export").addEventListener("click", exportCatalogue);
    return node;
  }

  function exportCatalogue() {
    var payload = {
      "@context": "https://plataforma.haak.world/schema/prototype/v0.1",
      practice: SEED.artist.practice,
      artist: { name: SEED.artist.name, wikidata: SEED.artist.wikidata },
      works: confirmedList().map(function (w) {
        return { id: w.id, title: w.title, year: w.year, disciplines: w.disciplines,
                 modules: w.modules, coAuthors: w.coAuthors, description: w.description,
                 published: isPublished(w.id) };
      }),
      exported: "prototype-demo"
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "okwui-okpokwasili-catalogue.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported — your data, your file");
  }

  /* ================================================================ VIEW: pod */
  function viewPod() {
    var node = el('<div class="view"></div>');
    var pod = SEED.pod;
    node.appendChild(el(
      '<div class="view-head"><div class="eyebrow">Step 4 · ' + esc(pod.name) + '</div>' +
      '<h1>You’re not alone in here.</h1>' +
      '<p>Convened by ' + esc(pod.convener) + '.</p></div>'));
    node.appendChild(el('<div class="pod-blurb">' + esc(pod.blurb) + '</div>'));

    pod.members.forEach(function (m) {
      var stateNow = state.podInvites[m.name] || m.state;
      var row = el(
        '<div class="pod-member">' +
          '<div class="avatar" style="width:44px;height:44px;font-size:17px">' + initials(m.name) + '</div>' +
          '<div><div class="pm-name">' + esc(m.name) + (m.you ? ' <span class="pill disc">you</span>' : "") + '</div>' +
            '<div class="pm-role">' + esc(m.role) + " · " + esc(m.discipline) + '</div>' +
            (m.note ? '<div class="pm-note">' + esc(m.note) + '</div>' : "") + '</div>' +
          '<div class="spacer"></div>' +
          '<span class="state-chip ' + stateNow + '">' + stateNow + '</span>' +
        '</div>');
      if (stateNow === "discovered" || stateNow === "invited") {
        var b = mkBtn("btn", stateNow === "invited" ? "Resend invite" : "Invite to Pod", function () {
          state.podInvites[m.name] = "invited"; save(); render();
          toast("Invited " + m.name.split(" ")[0]);
        });
        b.style.marginLeft = "10px";
        row.appendChild(b);
      }
      node.appendChild(row);
    });
    node.appendChild(el('<div class="btn-row"><a class="btn primary" href="#/public/okwui">See how the Pod looks publicly →</a></div>'));
    return node;
  }

  /* ============================================================= VIEW: public */
  function viewPublic() {
    var node = el('<div class="view"></div>');
    var a = SEED.artist;
    var works = confirmedList().filter(function (w) { return isPublished(w.id); });

    node.appendChild(el('<div class="crumb" style="color:var(--faint);font-size:13px;margin-bottom:12px">' +
      'Public directory · what a curator, presenter, or peer sees</div>'));

    var hero = el(
      '<div class="public-hero">' +
        '<h1 class="p-name">' + esc(a.name) + '</h1>' +
        '<div class="p-sub">' + esc(a.practice.name) + " — " +
          esc(a.practice.members.map(function (m) { return m.name; }).join(" + ")) +
          " · " + esc(a.practice.disciplines.slice(0, 3).join(", ")) + '</div>' +
        '<div class="ids">' +
          '<span>Born ' + esc(a.born) + " · " + esc(a.nationality) + '</span>' +
          '<span>Wikidata ' + esc(a.wikidata) + '</span>' +
          '<span>' + esc(a.site) + '</span>' +
        '</div>' +
      '</div>');
    node.appendChild(hero);

    if (!works.length) {
      node.appendChild(el('<div class="empty-state">No public works yet. Confirm works and set them public in your ' +
        '<a href="#/catalogue">catalogue</a>.</div>'));
      return node;
    }

    node.appendChild(el('<h2 class="view-head" style="font-family:var(--serif);font-size:20px;margin:6px 0 14px">Works (' + works.length + ')</h2>'));
    var grid = el('<div class="pub-grid"></div>');
    works.forEach(function (w) {
      var g = glyphFor(w);
      grid.appendChild(el(
        '<a class="pub-work" href="#/catalogue">' +
          '<div class="pw-glyph">' + esc(w.title) + '</div>' +
          '<div class="pw-body"><div class="pw-title">' + esc(w.title) + '</div>' +
            '<div class="pw-meta">' + esc(w.year || "") + (w.disciplines ? ' · ' + esc(w.disciplines.join(", ")) : "") + '</div>' +
          '</div>' +
        '</a>'));
    });
    node.appendChild(grid);

    // Pod strip — discovery gateway to other members.
    var others = SEED.pod.members.filter(function (m) { return !m.you; });
    var strip = el('<div class="pod-strip"><h2 style="font-family:var(--serif);font-size:18px;margin:0 0 10px">' +
      'In the ' + esc(SEED.pod.name) + '</h2><p style="color:var(--muted);font-size:14px;margin:0 0 12px">' +
      'One artist’s page is a gateway to their collaborators — the discovery no portfolio site gives you.</p></div>');
    others.forEach(function (m) {
      var stateNow = state.podInvites[m.name] || m.state;
      strip.appendChild(el('<a href="#/pod">' + esc(m.name) + ' <span style="color:var(--faint)">· ' + esc(stateNow) + '</span></a>'));
    });
    node.appendChild(strip);
    return node;
  }

  /* --------------------------------------------------------------- utilities */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = el('<div class="toast"></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  // Wire up footer reset once the DOM is ready.
  document.addEventListener("DOMContentLoaded", function () {
    var rb = document.getElementById("reset-demo");
    if (rb) rb.addEventListener("click", resetDemo);
    if (!location.hash) location.hash = "#/";
    render();
  });
})();
