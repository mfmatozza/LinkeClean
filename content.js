// LinkedIn Feed Cleaner - Content Script
(function () {
  "use strict";

  const DEFAULT_FILTERS = {
    anniversaries: true,
    celebrations: true,
    ads: true,
    suggested: true,
    polls: true,
    promoted: true,
    followRecommendations: true,
    reactions: true, // "X liked this", "X commented on this"
    groupPosts: false,
    newsletters: true,
    events: true,
  };

  let filters = { ...DEFAULT_FILTERS };
  let removedCount = 0;

  // Load saved settings
  chrome.storage.sync.get("filters", (data) => {
    if (data.filters) filters = { ...DEFAULT_FILTERS, ...data.filters };
    startCleaning();
  });

  // Listen for settings changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.filters) {
      filters = { ...DEFAULT_FILTERS, ...changes.filters.newValue };
      // Re-show all hidden posts and re-filter
      document.querySelectorAll("[data-lfc-hidden]").forEach((el) => {
        el.style.display = "";
        el.removeAttribute("data-lfc-hidden");
      });
      removedCount = 0;
      cleanFeed();
    }
  });

  // --- Keyword / pattern matchers ---

  const ANNIVERSARY_PATTERNS = [
    /work anniversary/i,
    /anniversary at/i,
    /celebrating.*year/i,
    /\d+\s*(?:year|yr)s?\s*at\s/i,
    /anniversario/i,
    /anni presso/i,
  ];

  const CELEBRATION_PATTERNS = [
    /started a new position/i,
    /new job/i,
    /new role/i,
    /just joined/i,
    /happy to share/i,
    /excited to announce/i,
    /i'm happy to announce/i,
    /promoted to/i,
    /congrats/i,
    /congratulations/i,
    /birthday/i,
    /kudos/i,
    /ha iniziato/i,
    /nuovo ruolo/i,
    /nuova posizione/i,
  ];

  const NEWSLETTER_PATTERNS = [
    /published a newsletter/i,
    /newsletter:/i,
    /subscribe to/i,
    /ha pubblicato una newsletter/i,
  ];

  const EVENT_PATTERNS = [
    /is attending/i,
    /is hosting/i,
    /upcoming event/i,
    /virtual event/i,
    /register now/i,
    /parteciperà/i,
  ];

  function textMatches(text, patterns) {
    return patterns.some((p) => p.test(text));
  }

  // --- Post detection helpers ---

  function isPromotedPost(post) {
    if (!filters.promoted) return false;
    const promotedLabel = post.querySelector(
      'span[class*="feed-shared-actor__sub-description"] span, ' +
      '[data-ad-banner-identifier], ' +
      '.update-components-actor__sub-description'
    );
    if (promotedLabel) {
      const text = promotedLabel.textContent.toLowerCase();
      if (text.includes("promoted") || text.includes("sponsorizzat")) return true;
    }
    // Also check for "Promoted" as a standalone span
    const allSpans = post.querySelectorAll("span");
    for (const span of allSpans) {
      const t = span.textContent.trim().toLowerCase();
      if (t === "promoted" || t === "sponsorizzato" || t === "sponsorizzata") return true;
    }
    return false;
  }

  function isSuggestedPost(post) {
    if (!filters.suggested) return false;
    const allSpans = post.querySelectorAll("span");
    for (const span of allSpans) {
      const t = span.textContent.trim().toLowerCase();
      if (t === "suggested" || t === "consigliato" || t === "consigliata") return true;
    }
    return false;
  }

  function isReactionPost(post) {
    if (!filters.reactions) return false;
    const header = post.querySelector(
      ".update-components-header, " +
      '[data-urn*="header"], ' +
      ".feed-shared-header"
    );
    if (!header) return false;
    const text = header.textContent.toLowerCase();
    return (
      /likes?\s+this/i.test(text) ||
      /commented\s+on\s+this/i.test(text) ||
      /reacted\s+to\s+this/i.test(text) ||
      /finds\s+this/i.test(text) ||
      /loves?\s+this/i.test(text) ||
      /celebrates?\s+this/i.test(text) ||
      /supports?\s+this/i.test(text) ||
      /piace a/i.test(text) ||
      /ha commentato/i.test(text) ||
      /ha reagito/i.test(text)
    );
  }

  function isPoll(post) {
    if (!filters.polls) return false;
    return !!post.querySelector(
      ".feed-shared-poll, " +
      '[class*="poll"], ' +
      '[data-urn*="poll"]'
    );
  }

  function isFollowRecommendation(post) {
    if (!filters.followRecommendations) return false;
    const text = post.textContent.toLowerCase();
    return (
      post.querySelector('[class*="follow-recommendation"]') !== null ||
      /people you may know/i.test(text) ||
      /try linkedin premium/i.test(text) ||
      /people also viewed/i.test(text) ||
      /add to your feed/i.test(text) ||
      /persone che potresti conoscere/i.test(text) ||
      /prova linkedin premium/i.test(text)
    );
  }

  function isAd(post) {
    if (!filters.ads) return false;
    return (
      post.querySelector('[data-ad-banner-identifier]') !== null ||
      post.querySelector('[class*="ad-banner"]') !== null
    );
  }

  function getPostText(post) {
    const textEl = post.querySelector(
      ".feed-shared-update-v2__description, " +
      ".update-components-text, " +
      '[class*="break-words"], ' +
      ".feed-shared-text"
    );
    const headerEl = post.querySelector(
      ".update-components-header, " +
      ".feed-shared-header"
    );
    return (
      (textEl ? textEl.textContent : "") +
      " " +
      (headerEl ? headerEl.textContent : "")
    );
  }

  // --- Main filter logic ---

  function shouldHide(post) {
    if (post.hasAttribute("data-lfc-checked")) return false;
    post.setAttribute("data-lfc-checked", "true");

    if (isPromotedPost(post)) return "promoted";
    if (isSuggestedPost(post)) return "suggested";
    if (isAd(post)) return "ad";
    if (isFollowRecommendation(post)) return "follow-rec";
    if (isPoll(post)) return "poll";
    if (isReactionPost(post)) return "reaction";

    const text = getPostText(post);

    if (filters.anniversaries && textMatches(text, ANNIVERSARY_PATTERNS))
      return "anniversary";
    if (filters.celebrations && textMatches(text, CELEBRATION_PATTERNS))
      return "celebration";
    if (filters.newsletters && textMatches(text, NEWSLETTER_PATTERNS))
      return "newsletter";
    if (filters.events && textMatches(text, EVENT_PATTERNS)) return "event";

    return false;
  }

  function cleanFeed() {
    // LinkedIn uses several selectors for feed items
    const posts = document.querySelectorAll(
      '.feed-shared-update-v2:not([data-lfc-checked]), ' +
      '[data-urn*="activity"]:not([data-lfc-checked]), ' +
      '.scaffold-finite-scroll__content > div > div:not([data-lfc-checked])'
    );

    posts.forEach((post) => {
      const reason = shouldHide(post);
      if (reason) {
        // Walk up to the top-level feed container div
        let target = post;
        while (
          target.parentElement &&
          !target.parentElement.classList.contains(
            "scaffold-finite-scroll__content"
          ) &&
          !target.parentElement.matches('[role="main"]')
        ) {
          target = target.parentElement;
        }
        target.style.display = "none";
        target.setAttribute("data-lfc-hidden", reason);
        removedCount++;
      }
    });

    // Also hide sidebar noise
    const sidebarNoise = document.querySelectorAll(
      '.ad-banner-container, [data-ad-banner-identifier], ' +
      '[class*="ad-banner"], .premium-upsell'
    );
    sidebarNoise.forEach((el) => {
      el.style.display = "none";
      el.setAttribute("data-lfc-hidden", "sidebar-ad");
    });
  }

  function startCleaning() {
    // Initial clean
    cleanFeed();

    // Observe for new posts being loaded (infinite scroll)
    const observer = new MutationObserver(() => {
      cleanFeed();
    });

    // Watch the main feed area
    const feedContainer =
      document.querySelector(".scaffold-finite-scroll__content") ||
      document.querySelector('[role="main"]') ||
      document.body;

    observer.observe(feedContainer, {
      childList: true,
      subtree: true,
    });

    // Also run periodically as a fallback
    setInterval(cleanFeed, 2000);
  }
})();
