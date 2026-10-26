/* Salary Calc — every period goes through a yearly figure using your hours, days and weeks. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "salary.v1";
  var CURS = ["", "JOD", "USD", "EUR", "GBP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "EGP", "TRY", "INR", "PKR", "CAD", "AUD", "JPY", "CHF"];
  var PERIODS = [["hour", "Per hour"], ["day", "Per day"], ["week", "Per week"], ["biweek", "Every 2 weeks"], ["semimonth", "Twice a month"], ["month", "Per month"], ["year", "Per year"]];
  var st = { ot: "1.5", rsLast: "p", text: "" };

  function num(v) {
    v = String(v == null ? "" : v)
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; })
      .replace(/٫/g, ".").replace(/[,\s_٬]/g, "");
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(v) ? parseFloat(v) : NaN;
  }

  // How many of each period fit in a year, given the work pattern.
  function perYear(p, w) {
    return { hour: w.hpw * w.wpy, day: w.dpw * w.wpy, week: w.wpy, biweek: w.wpy / 2, semimonth: 24, month: 12, year: 1 }[p];
  }
  function convert(amount, from, to, w) { return amount * perYear(from, w) / perYear(to, w); }
  function overtime(hourly, hours, mult, w) { var wk = hourly * mult * hours; return { week: wk, month: wk * w.wpy / 12, year: wk * w.wpy }; }
  function raisePct(oldV, newV) { return oldV > 0 ? (newV - oldV) / oldV * 100 : NaN; }

  function cur() { return $("#cur").value; }
  function money(v) {
    if (!isFinite(v)) return "—";
    try { if (cur()) return Intl.NumberFormat(undefined, { style: "currency", currency: cur() }).format(v); } catch (e) { /* unknown code: plain */ }
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function work() { return { hpw: num($("#hpw").value), dpw: num($("#dpw").value), wpy: num($("#wpy").value) }; }
  function row(label, value, cls) { return '<div class="' + (cls || "") + '"><dt>' + S3.esc(label) + "</dt><dd>" + S3.esc(value) + "</dd></div>"; }

  function save() {
    S3.store(KEY, { amt: $("#amt").value, per: $("#per").value, cur: cur(), hpw: $("#hpw").value, dpw: $("#dpw").value, wpy: $("#wpy").value,
      otH: $("#ot-h").value, ot: st.ot, rsP: $("#rs-p").value, rsN: $("#rs-n").value, rsLast: st.rsLast });
  }

  function render() {
    save();
    var w = work(), amt = num($("#amt").value), per = $("#per").value, err = "";
    if (!(w.hpw > 0 && w.hpw <= 168)) err = "Hours per week must be between 0 and 168.";
    else if (!(w.dpw > 0 && w.dpw <= 7)) err = "Days per week must be between 0 and 7.";
    else if (!(w.wpy > 0 && w.wpy <= 53)) err = "Weeks per year must be between 0 and 53.";
    else if ($("#amt").value.trim() && !(amt >= 0)) err = "Enter a pay amount of 0 or more.";
    $("#err").textContent = err;
    var ok = !err && amt >= 0 && $("#amt").value.trim() !== "";
    $("#periods").innerHTML = "";
    PERIODS.forEach(function (p) {
      var v = ok ? convert(amt, per, p[0], w) : NaN;
      $("#periods").appendChild(S3.h("button", { type: "button", "class": "per" + (p[0] === per ? " on" : "") + (p[0] === "month" || p[0] === "year" ? " main" : ""),
        title: "Use this period as the input", onclick: function () { if (ok) { $("#per").value = p[0]; $("#amt").value = String(Number(v.toFixed(2))); render(); } } },
        [S3.h("span", { text: p[1] }), S3.h("b", { text: ok ? money(v) : "—" })]));
    });
    st.text = ok ? PERIODS.map(function (p) { return p[1] + ": " + money(convert(amt, per, p[0], w)); }).join("\n") +
      "\n(" + w.hpw + " h/week, " + w.dpw + " days/week, " + w.wpy + " weeks/year)" : "";

    // overtime
    var hourly = ok ? convert(amt, per, "hour", w) : NaN, oh = num($("#ot-h").value), mult = +st.ot;
    if (ok && oh >= 0) {
      var o = overtime(hourly, oh, mult, w), month = convert(amt, per, "month", w);
      $("#ot-res").innerHTML = row("Normal hourly rate", money(hourly)) + row("Overtime rate (" + mult + "×)", money(hourly * mult) + " / h") +
        row("Overtime pay / week", money(o.week)) + row("Overtime pay / month", money(o.month)) + row("Monthly pay with overtime", money(month + o.month), "hl");
    } else $("#ot-res").innerHTML = row("Overtime", ok ? "Enter overtime hours" : "Enter your pay first");

    // raise (two-way: percent or new monthly pay)
    var base = ok ? convert(amt, per, "month", w) : NaN, rp, nm;
    if (st.rsLast === "p") { rp = num($("#rs-p").value); nm = base * (1 + rp / 100); if (ok && isFinite(nm) && $("#rs-p").value.trim()) $("#rs-n").value = String(Number(nm.toFixed(2))); }
    else { nm = num($("#rs-n").value); rp = raisePct(base, nm); if (isFinite(rp)) $("#rs-p").value = String(Number(rp.toFixed(2))); }
    if (ok && isFinite(rp) && isFinite(nm)) {
      $("#rs-res").innerHTML = row("New pay / month", money(nm), "hl") + row("New pay / year", money(convert(nm, "month", "year", w))) +
        row("New hourly rate", money(convert(nm, "month", "hour", w))) + row("Increase / month", (nm >= base ? "+" : "") + money(nm - base)) +
        row("Increase / year", (nm >= base ? "+" : "") + money((nm - base) * 12));
    } else $("#rs-res").innerHTML = row("Raise", ok ? "Enter a raise % or the new monthly pay" : "Enter your pay first");
  }

  // ---------- wiring ----------
  CURS.forEach(function (c) {
    var label = c;
    if (c) { try { var sym = Intl.NumberFormat("en", { style: "currency", currency: c, currencyDisplay: "narrowSymbol" }).formatToParts(0).filter(function (p) { return p.type === "currency"; })[0].value; if (sym !== c) label = c + " · " + sym; } catch (e) { /* keep code */ } }
    $("#cur").appendChild(S3.h("option", { value: c, text: c ? label : "None" }));
  });
  var sv = S3.store(KEY) || {};
  $("#amt").value = sv.amt != null ? sv.amt : "1,200"; $("#per").value = PERIODS.some(function (p) { return p[0] === sv.per; }) ? sv.per : "month";
  $("#cur").value = CURS.indexOf(sv.cur) >= 0 ? sv.cur : "";
  $("#hpw").value = sv.hpw || "40"; $("#dpw").value = sv.dpw || "5"; $("#wpy").value = sv.wpy || "52";
  $("#ot-h").value = sv.otH != null ? sv.otH : "5"; st.ot = /^(1\.25|1\.5|2)$/.test(sv.ot) ? sv.ot : "1.5";
  $("#rs-p").value = sv.rsP != null ? sv.rsP : "5"; $("#rs-n").value = sv.rsN || ""; st.rsLast = sv.rsLast === "n" ? "n" : "p";
  $$("#ot-x button").forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.dataset.v === st.ot));
    b.addEventListener("click", function () { st.ot = b.dataset.v; $$("#ot-x button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); render(); });
  });
  $$("#amt, #hpw, #dpw, #wpy, #ot-h").forEach(function (el) { el.addEventListener("input", render); });
  $$("#per, #cur").forEach(function (el) { el.addEventListener("change", render); });
  $("#rs-p").addEventListener("input", function () { st.rsLast = "p"; if (!this.value.trim()) $("#rs-n").value = ""; render(); });
  $("#rs-n").addEventListener("input", function () { st.rsLast = "n"; if (!this.value.trim()) $("#rs-p").value = ""; render(); });
  $("#copy").addEventListener("click", function () {
    if (!st.text) return S3.toast("Enter your pay first", "error");
    S3.copy(st.text); S3.done();
  });
  render();

  window.S3_DEMO = function () {
    $("#amt").value = "52,000"; $("#per").value = "year"; $("#cur").value = "USD"; $("#hpw").value = "40"; $("#dpw").value = "5"; $("#wpy").value = "52";
    $("#ot-h").value = "6"; $("#rs-p").value = "7"; st.rsLast = "p"; render();
  };

  window.S3_SELFTEST = function () {
    var w = { hpw: 40, dpw: 5, wpy: 52 }, o = overtime(25, 5, 1.5, w);
    function near(a, b) { return Math.abs(a - b) < 1e-9; }
    return near(convert(25, "hour", "year", w), 52000) && near(convert(52000, "year", "hour", w), 25) && near(convert(52000, "year", "day", w), 200) &&
      convert(52000, "year", "month", w).toFixed(2) === "4333.33" && near(convert(52000, "year", "biweek", w), 2000) &&
      near(convert(1000, "week", "year", w), 52000) && near(convert(1200, "month", "semimonth", w), 600) &&
      near(convert(30, "hour", "day", { hpw: 36, dpw: 4, wpy: 52 }), 270) &&           // 9-hour days
      near(o.week, 187.5) && near(o.month, 812.5) &&
      near(raisePct(52000, 54600), 5) && raisePct(52000, 55000).toFixed(2) === "5.77" && isNaN(raisePct(0, 10));
  };
})();
