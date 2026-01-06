(function (w, d) {
  "use strict";

  /* -----------------------------
     A) Helpers
  ----------------------------- */
  const CFG = {
    POST_SCOPES: [
      ".post-body",
      "[itemprop='articleBody']",
      "article",
      ".entry-content",
      ".post-content",
      "body",
    ],
    DONE_ATTR: "data-iqraa-done",
    OBS_DEBOUNCE: 80,
    IO_ROOT_MARGIN: "600px 0px",
  };

  const $ = (sel, root) => (root || d).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || d).querySelectorAll(sel));

  const normalize = (s) =>
    String(s ?? "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();

  const escapeHtml = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function getPostScope() {
    for (const sel of CFG.POST_SCOPES) {
      const el = $(sel);
      if (el) return el;
    }
    return d.body || d;
  }

  function htmlToTextKeepLines(html) {
    const x = String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n");
    const tmp = d.createElement("div");
    tmp.innerHTML = x;
    return (tmp.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function removeMarkerFromHtml(html, marker) {
    const re = new RegExp(escapeRegExp(marker), "ig");
    return String(html || "").replace(re, "").trim();
  }

  function looksLikePlaceholderSrc(src) {
    const s = String(src || "").trim();
    if (!s) return true;
    // common placeholders
    if (s.startsWith("data:image/")) return true;
    if (s.includes("placeholder")) return true;
    return false;
  }

  /* -----------------------------
     B) Globals required by theme
  ----------------------------- */

  w.$iVA = function (text) {
    return String(text || "").split(",");
  };

  w.$iEl = function (selector) {
    return d.querySelector(selector);
  };
  w.$iEls = function (selector) {
    return d.querySelectorAll(selector);
  };

  w.$shuffleArray = function (arr) {
    return (arr || []).sort(() => Math.random() - 0.5);
  };

  w.$iAClass = function (elements, classes) {
    const els = Array.isArray(elements) ? elements : [elements];
    const cls = Array.isArray(classes) ? classes : [classes];
    els.forEach((el, i) => {
      if (!el || !el.classList) return;
      const c = cls.length === 1 ? cls[0] : cls[i];
      if (c) el.classList.add(c);
    });
  };

  w.$iAMClasses = function (element, classesArray) {
    if (!element || !element.classList) return;
    (classesArray || []).forEach((c) => c && element.classList.add(c));
  };

  w.$iRClass = function (elements, classes) {
    const els = Array.isArray(elements) ? elements : [elements];
    const cls = Array.isArray(classes) ? classes : [classes];
    els.forEach((el, i) => {
      if (!el || !el.classList) return;
      const c = cls.length === 1 ? cls[0] : cls[i];
      if (c) el.classList.remove(c);
    });
  };

  w.$iTClass = function (elements, classes) {
    const els = Array.isArray(elements) ? elements : [elements];
    const cls = Array.isArray(classes) ? classes : [classes];
    els.forEach((el, i) => {
      if (!el || !el.classList) return;
      const c = cls.length === 1 ? cls[0] : cls[i];
      if (c) el.classList.toggle(c);
    });
  };

  w.$iRTClass = function (element, oldClass, newClass) {
    if (!element || !element.classList) return;
    if (oldClass && newClass) element.classList.replace(oldClass, newClass);
  };

  w.$iClick = function (element, callback) {
    if (element) element.addEventListener("click", callback);
  };

  w.iEncode = function (str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode("0x" + p1)
      )
    );
  };

  w.iDecode = function (str) {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  };

  w.$iVB = function (v) {
    return String(v).toLowerCase() === "true";
  };
  w.$iRVB = function (v) {
    return String(v).toLowerCase() !== "true";
  };

  /* -----------------------------
     C) License check (SAFE)
  ----------------------------- */
  const IQRAA_LICENSE_MODE = "enforce"; // "enforce" | "warn" | "off"

  w.inv = function () {
    if (IQRAA_LICENSE_MODE === "off") return;

    if (IQRAA_LICENSE_MODE === "warn") {
      console.warn("[IQRAA] License check failed (WARN mode).");
      return;
    }

    // enforce
    try {
      if (d.body) d.body.innerHTML = "";
    } catch (e) {}

    try {
      const canonical = d.querySelector("link[rel='canonical']")?.href;
      if (canonical) {
        location.href = canonical;
        location.assign(canonical);
      }
    } catch (e) {}
  };

  w.iv = function () {
    if (IQRAA_LICENSE_MODE === "off") return true;

    // enforce only when BOTH meta + iBlogId exist
    const meta = d.querySelector("meta[name='google-site-verification']");
    const content = meta?.content || "";
    const hasBlogId = typeof w.iBlogId !== "undefined" && String(w.iBlogId || "").length;

    if (!content || !hasBlogId) {
      if (IQRAA_LICENSE_MODE === "warn") {
        console.warn("[IQRAA] License data missing: skipping enforce on this page.");
      }
      return true;
    }

    if (String(content) === String(w.iBlogId) && String(content) !== "YOUR_VALIDATION_STRING") return true;

    w.inv();
    return false;
  };

  w.addEventListener("load", function () {
    w.iv();
  });

  /* -----------------------------
     D) Query params + pagination globals
  ----------------------------- */
  w.getQueryParam = function (param) {
    const q = w.location.search.substring(1);
    const arr = decodeURIComponent(q).split("&");
    for (let i = 0; i < arr.length; i++) {
      const [k, v] = arr[i].split("=");
      if (k === param) return v === undefined ? undefined : v;
    }
    return null;
  };

  w.iIPN_Current_Page = parseInt(w.getQueryParam("page")) || 1;
  w.iIPN_Next_Page = w.iIPN_Current_Page + 1;
  w.iIPN_Prev_Page = w.iIPN_Current_Page - 1;

  /* -----------------------------
     E) Image sizing utility (Google)
  ----------------------------- */
  w.$iGIIL = function (url, sizeStr) {
    const re = /=(w|s|h)\d+$/;
    if (re.test(url)) return url.replace(re, "=" + sizeStr);

    const lastSlash = url.lastIndexOf("/");
    if (lastSlash === -1) return url;

    const base = url.substring(0, lastSlash);
    const file = url.substring(lastSlash);

    if (/\/(s|w|h)[0-9]+|\/d\//.test(base)) {
      const cleanedFile = file.replace(/\.png$|\.jpeg$|\.jpg$/i, ".png");
      return base + "/" + sizeStr + cleanedFile;
    }
    return url;
  };

  w.iGetAuthorImage = function (url) {
    const DEFAULT_AVATAR =
      "//lh3.googleusercontent.com/zFdxGE77vvD2w5xHy6jkVuElKv-U9_9qww";
    const FALLBACK_AVATAR = "https://1.bp.blogspot.com/-.../user.png"; // عدلها
    if (url === DEFAULT_AVATAR) return FALLBACK_AVATAR;
    return w.$iGIIL(url, "w100-h100-p-k-no-nu");
  };

  w.iGetAuthorSocLinks = function (linksObj) {
    let html = "";
    for (const link in linksObj) {
      const platform = String(link).substring(4).toLowerCase();
      html +=
        `<a href="${escapeHtml(linksObj[link])}" target="_blank" rel="noopener noreferrer" ` +
        `title="${escapeHtml(platform)}" class="${escapeHtml(platform)}">` +
        `<svg><use xlink:href="#i${escapeHtml(platform)}"></use></svg></a>`;
    }
    return html;
  };

  /* -----------------------------
     F) Blogger Product fetch
  ----------------------------- */
  w.$iGPs = async function (url, returnEntry) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      return returnEntry ? json.entry : json.feed.entry;
    } catch (e) {
      console.error("Error fetching:", url, e);
      throw e;
    }
  };

  w.iqraaGetPriceAndDesc = function (htmlString) {
    const doc = new DOMParser().parseFromString(htmlString, "text/html");
    return [
      doc.querySelector('meta[itemprop="price"]')?.content?.trim() || null,
      doc.querySelector('div[itemprop="description"]')?.textContent?.trim() || null,
    ];
  };

  w.iLoadProductInfos = function (postId) {
    if (!w.blogUrl) return;
    const fetchUrl = w.blogUrl + "/feeds/posts/default/" + postId + "?alt=json";

    w.$iGPs(fetchUrl, true)
      .then((entry) => {
        const content = entry?.content?.$t || "";
        const [price, desc] = w.iqraaGetPriceAndDesc(content);

        const box = d.querySelector(`.iRelatedPosts[data-id="${postId}"]`);
        if (!box) return;

        const priceEl = box.querySelector(".price");
        const descEl = box.querySelector(".description");
        if (priceEl && price) priceEl.textContent = price;
        if (descEl && desc) descEl.textContent = desc;
      })
      .catch((e) => console.error("Error loading product info:", e));
  };

  /* -----------------------------
     G) Shortcodes Engine
  ----------------------------- */
  if (typeof w.iCopyCodeIcon === "undefined") {
    w.iCopyCodeIcon =
      "<svg class='iCS__icon' viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>" +
      "<path d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/>" +
      "</svg>";
  }

  const MESSAGE = {
    info: { class: "info", ar: "رسالة معلومات" },
    success: { class: "success", ar: "رسالة إيجابية" },
    error: { class: "error", ar: "رسالة خطأ" },
    warning: { class: "warning", ar: "رسالة تحذير" },
  };

  const BUTTONS = {
    download: { class: "download", ar: ["تحميل", "زر تحميل"] },
    demo: { class: "demo", ar: ["معاينة", "زر معاينة"] },
    buy: { class: "buy", ar: ["شراء", "زر شراء"] },
    link: { class: "link", ar: ["زيارة الرابط", "زر رابط"] },
  };

  const CODE_TYPES = {
    "كود html": "html",
    "كود css": "css",
    "كود js": "javascript",
  };

  const HIDE = {
    "بدون مقالات ذات صلة": ".iRelatedPosts",
    "بدون جدول محتويات": ".iqraatoc",
    "بدون أداة كاتب الموضوع": ".iauthorbox",
    "بدون أداة اقرأ أيضاً": ".iAlsoRead",
    "بدون أداة المقال التالي والسابق": ".iPostsPagination",
    "شاشة كاملة": "__FULL__",
  };

  function tplMessage(contentHtml, typeClass, titled) {
    // keep minimal + compatible classes
    return `<div class="iqraa-message ${typeClass}">${titled ? `<span class="imtitle"></span>` : ""}${contentHtml}</div>`;
  }

  function tplPdf(url) {
    return `<iframe class="lazyload" data-src="${escapeHtml(url)}" width="100%" height="600px"></iframe>`;
  }

  function parseYoutubeId(s) {
    const t = String(s || "").trim();
    if (/^[a-zA-Z0-9_-]{8,}$/.test(t) && !t.includes("http")) return t;
    const m1 = t.match(/[?&]v=([^&]+)/);
    if (m1) return m1[1];
    const m2 = t.match(/youtu\.be\/([^?&/]+)/);
    if (m2) return m2[1];
    const m3 = t.match(/youtube\.com\/embed\/([^?&/]+)/);
    if (m3) return m3[1];
    return t;
  }

  function tplVideo(idOrUrl) {
    const id = parseYoutubeId(idOrUrl);
    return (
      `<div class="iYouTubeiFrame"><iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" ` +
      `allowfullscreen="" class="iframe-video iYTBLazy" data-src="https://www.youtube.com/embed/${escapeHtml(id)}" ` +
      `frameborder="0" title="YouTube video player"></iframe></div>`
    );
  }

  function tplButton(url, cls, label) {
    return `<a class="button ${escapeHtml(cls)} soft-rounded" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(label)}</span></a>`;
  }

  function tplCode(codeText, typeLabel) {
    const lang = CODE_TYPES[typeLabel] || "javascript";
    const iconName = lang === "html" ? "Html" : lang === "css" ? "Css" : "Js";
    return (
      `<div class="iCodeSnippet">` +
      `<div class="iCS__header">` +
      `<span class="iCS__type"><svg><use xlink:href="#i${iconName}Icon"></use></svg> ${escapeHtml(iconName)}</span>` +
      `<button class="iCS__copy_btn" type="button">${w.iCopyCodeIcon}نسخ الكود</button>` +
      `</div>` +
      `<pre class="iCS__pre"><code class="iCS__code language-${escapeHtml(lang)}">${escapeHtml(codeText)}</code></pre>` +
      `</div>`
    );
  }

  function tplAccordion(title, contentHtml) {
    return (
      `<div class="iAccordion">` +
      `<div aria-expanded="false" class="iACC__header" tabindex="0">` +
      `${escapeHtml(title)}` +
      `<svg class="iACC__arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 7.33 2.83 4.5 12 13.84l9.17-9.34L24 7.33 12 19.5z"/></svg>` +
      `</div>` +
      `<div aria-hidden="true" class="iACC__body"><div class="iACC__content">${contentHtml}</div></div>` +
      `</div>`
    );
  }

  function tplHide(selector) {
    return `<style>${selector}{display:none!important;}</style>`;
  }

  function tplFullWidth() {
    return `<style>.item #main-wrapper{width:100%}.item #sidebar-wrapper{display:none}</style>`;
  }

  w.findAndReplacePattern = function (text, fullHtml, pattern) {
    return String(text || "").includes(pattern) ? String(fullHtml || "").replace(pattern, "").trim() : null;
  };

  w.convertBlockquoteContent = function (root) {
    const scope = root || getPostScope();
    const blocks = $$(".post-body blockquote, blockquote", scope);

    blocks.forEach((el) => {
      if (el.getAttribute(CFG.DONE_ATTR) === "1") return;

      const t = normalize(el.textContent);
      const html = el.innerHTML || "";
      const tl = t.toLowerCase();

      if (!t) {
        el.setAttribute(CFG.DONE_ATTR, "1");
        return;
      }

      // Messages
      for (const key of Object.keys(MESSAGE)) {
        const meta = MESSAGE[key];

        const mk1 = `-${key}-`;
        const mk2 = `-${meta.ar}-`;

        const mk1t = `-${key} بعنوان-`;
        const mk2t = `-${meta.ar} بعنوان-`;

        if (tl.includes(mk1.toLowerCase())) {
          el.outerHTML = tplMessage(removeMarkerFromHtml(html, mk1), meta.class, false);
          return;
        }
        if (tl.includes(mk2.toLowerCase())) {
          el.outerHTML = tplMessage(removeMarkerFromHtml(html, mk2), meta.class, false);
          return;
        }
        if (tl.includes(mk1t.toLowerCase())) {
          el.outerHTML = tplMessage(removeMarkerFromHtml(html, mk1t), meta.class, true);
          return;
        }
        if (tl.includes(mk2t.toLowerCase())) {
          el.outerHTML = tplMessage(removeMarkerFromHtml(html, mk2t), meta.class, true);
          return;
        }
      }

      // Buttons
      for (const key of Object.keys(BUTTONS)) {
        const b = BUTTONS[key];
        const markers = [`-${key}-`, ...(b.ar || []).map((x) => `-${x}-`)];

        for (const mk of markers) {
          if (tl.includes(mk.toLowerCase())) {
            const parts = t.split(new RegExp("\\s*" + escapeRegExp(mk) + "\\s*", "i")).map(normalize);
            const url = parts[0];
            const label = parts[1] || (b.ar && b.ar[0]) || key;
            if (url) {
              el.outerHTML = tplButton(url, b.class, label);
              return;
            }
          }
        }
      }

      // Code
      for (const label of Object.keys(CODE_TYPES)) {
        const mk = `-${label}-`;
        if (tl.includes(mk.toLowerCase())) {
          const cleanedHtml = removeMarkerFromHtml(html, mk);
          const codeText = htmlToTextKeepLines(cleanedHtml);
          el.outerHTML = tplCode(codeText, label);
          return;
        }
      }

      // Video
      for (const mk of ["-تضمين فيديو-", "-video-"]) {
        if (tl.includes(mk.toLowerCase())) {
          const cleaned = normalize(htmlToTextKeepLines(removeMarkerFromHtml(html, mk)));
          if (cleaned) {
            el.outerHTML = tplVideo(cleaned);
            return;
          }
        }
      }

      // PDF
      for (const mk of ["-تضمين pdf-", "-pdf-"]) {
        if (tl.includes(mk.toLowerCase())) {
          const cleaned = normalize(htmlToTextKeepLines(removeMarkerFromHtml(html, mk)));
          if (cleaned) {
            el.outerHTML = tplPdf(cleaned);
            return;
          }
        }
      }

      // Accordion
      if (tl.includes("-أكورديون-")) {
        const parts = String(html).split("-أكورديون-");
        const titleHtml = (parts[0] || "").trim();
        const bodyHtml = parts.slice(1).join("-أكورديون-").trim();

        const tmp = d.createElement("div");
        tmp.innerHTML = titleHtml;
        const titleText = normalize(tmp.textContent);

        if (titleText) {
          el.outerHTML = tplAccordion(titleText, bodyHtml);
          return;
        }
      }

      el.setAttribute(CFG.DONE_ATTR, "1");
    });
  };

  w.convertStrikeContent = function (root) {
    const scope = root || getPostScope();
    const strikes = $$(".post-body strike, .post-body s, .post-body del, strike, s, del", scope);

    strikes.forEach((el) => {
      if (el.getAttribute(CFG.DONE_ATTR) === "1") return;

      const t = normalize(el.textContent);

      for (const cmd of Object.keys(HIDE)) {
        if (t.includes(cmd)) {
          const sel = HIDE[cmd];
          el.outerHTML = sel === "__FULL__" ? tplFullWidth() : tplHide(sel);
          return;
        }
      }

      if (t.startsWith("hideElement:") || t.startsWith("hideElements:")) {
        const selectors = t.split(":").slice(1).join(":").trim();
        if (selectors) el.outerHTML = `<style>${selectors}{display:none!important;}</style>`;
        return;
      }

      el.setAttribute(CFG.DONE_ATTR, "1");
    });
  };

  /* -----------------------------
     H) UI + Lazyload (FIX IMAGES)
  ----------------------------- */

  function bindUIOnce() {
    if (w.__IQRAA_UI_BOUND__) return;
    w.__IQRAA_UI_BOUND__ = true;

    d.addEventListener("click", async (e) => {
      // Copy code
      const btn = e.target && e.target.closest && e.target.closest(".iCS__copy_btn");
      if (btn) {
        const box = btn.closest(".iCodeSnippet");
        const code = box?.querySelector(".iCS__code")?.textContent || "";
        if (!code) return;

        const old = btn.innerHTML;
        const flash = (t) => {
          btn.textContent = t;
          setTimeout(() => (btn.innerHTML = old), 1200);
        };

        try {
          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(code);
            flash("تم النسخ");
          } else {
            throw new Error("clipboard");
          }
        } catch {
          try {
            const ta = d.createElement("textarea");
            ta.value = code;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            d.body.appendChild(ta);
            ta.select();
            d.execCommand("copy");
            ta.remove();
            flash("تم النسخ");
          } catch {
            flash("فشل النسخ");
          }
        }
        return;
      }

      // Accordion toggle
      const header = e.target && e.target.closest && e.target.closest(".iACC__header");
      if (header) {
        const expanded = header.getAttribute("aria-expanded") === "true";
        header.setAttribute("aria-expanded", String(!expanded));
        const body = header.nextElementSibling;
        if (body) body.setAttribute("aria-hidden", String(expanded));
      }
    });

    d.addEventListener("keydown", (e) => {
      const header = e.target && e.target.closest && e.target.closest(".iACC__header");
      if (!header) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        header.click();
      }
    });
  }

  // ✅ Core fix: lazyload for images + iframes + backgrounds
  function applyLazyMedia(root) {
    const scope = root || getPostScope();

    const imgs = $$("img[data-src], img[data-srcset], img[data-lazy-src], img.lazyload", scope);
    const iframes = $$("iframe[data-src]", scope);
    const bgEls = $$("[data-bg], [data-background]", scope);

    const setImage = (img) => {
      if (!img || img.__iqraa_loaded__) return;

      const dataLazy = img.getAttribute("data-lazy-src");
      const dataSrc = img.getAttribute("data-src");
      const dataSrcSet = img.getAttribute("data-srcset");

      // If it has data-src and current src is placeholder/empty => replace
      if (dataLazy && looksLikePlaceholderSrc(img.getAttribute("src"))) {
        img.setAttribute("src", dataLazy);
      }
      if (dataSrc && looksLikePlaceholderSrc(img.getAttribute("src"))) {
        img.setAttribute("src", dataSrc);
      }
      if (dataSrcSet) {
        img.setAttribute("srcset", dataSrcSet);
      }

      // Also support data-sizes
      const sizes = img.getAttribute("data-sizes");
      if (sizes && !img.getAttribute("sizes")) img.setAttribute("sizes", sizes);

      // Clean markers to avoid re-processing by other libs
      img.removeAttribute("data-src");
      img.removeAttribute("data-srcset");
      img.removeAttribute("data-lazy-src");

      img.classList.remove("lazyload");
      img.classList.add("lazyloaded");
      img.__iqraa_loaded__ = true;
    };

    const setIframe = (fr) => {
      if (!fr || fr.__iqraa_loaded__) return;
      const src = fr.getAttribute("data-src");
      if (src && !fr.getAttribute("src")) fr.setAttribute("src", src);
      fr.removeAttribute("data-src");
      fr.__iqraa_loaded__ = true;
    };

    const setBg = (el) => {
      if (!el || el.__iqraa_loaded__) return;
      const bg = el.getAttribute("data-bg") || el.getAttribute("data-background");
      if (bg) {
        el.style.backgroundImage = `url("${bg}")`;
        el.removeAttribute("data-bg");
        el.removeAttribute("data-background");
      }
      el.__iqraa_loaded__ = true;
    };

    // Fallback: no IO => load all immediately
    if (!("IntersectionObserver" in w)) {
      imgs.forEach(setImage);
      iframes.forEach(setIframe);
      bgEls.forEach(setBg);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (!ent.isIntersecting) return;
          const el = ent.target;
          if (el.tagName === "IMG") setImage(el);
          else if (el.tagName === "IFRAME") setIframe(el);
          else setBg(el);
          io.unobserve(el);
        });
      },
      { rootMargin: CFG.IO_ROOT_MARGIN }
    );

    imgs.forEach((img) => io.observe(img));
    iframes.forEach((fr) => io.observe(fr));
    bgEls.forEach((el) => io.observe(el));

    // ✅ Important: load what is already in viewport now (some themes hide until src)
    // We do a small immediate pass for images with no src
    imgs.forEach((img) => {
      if (looksLikePlaceholderSrc(img.getAttribute("src")) && (img.getAttribute("data-src") || img.getAttribute("data-lazy-src"))) {
        // If it's visible-ish, load it instantly
        const r = img.getBoundingClientRect();
        if (r.top < (w.innerHeight || 800) + 300) setImage(img);
      }
    });
  }

  /* -----------------------------
     I) Init (Runs always + observes “عرض المزيد”)
  ----------------------------- */
  function runAll() {
    const scope = getPostScope();

    bindUIOnce();

    // Important: Lazy media should run BEFORE/AFTER conversions (some tools create iframes)
    applyLazyMedia(scope);

    w.convertBlockquoteContent(scope);
    w.convertStrikeContent(scope);

    // Re-run after conversions to catch newly injected iframes/images
    applyLazyMedia(scope);
  }

  function init() {
    runAll();

    if (!w.__IQRAA_OBSERVER__ && "MutationObserver" in w) {
      const scope = getPostScope();
      let t = null;
      const mo = new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(runAll, CFG.OBS_DEBOUNCE);
      });
      mo.observe(scope, { childList: true, subtree: true });
      w.__IQRAA_OBSERVER__ = mo;
    }
  }

  if (d.readyState === "loading") {
    d.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }
})(window, document);
