import "./design/app.css";
import "./design/tweaks-panel";
import "./design/data";
import "./design/icons";
import "./design/parseQuickAdd";
import "./design/ui";
import "./design/screens-main";
import "./design/screens-other";
import "./design/app";

// Register service worker early so installed PWAs get a network-first HTML shell
// (defined in /public/sw.js). Without this, iOS PWAs aggressively cache index.html.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(reg => {
        // Force an update check on every launch
        reg.update().catch(() => {});
        // If a new SW is already waiting, ask it to activate now
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch(() => {});
    // When the controller changes (new SW activated), reload once to pick up
    // the fresh assets the new shell expects.
    let didReload = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (didReload) return;
      didReload = true;
      window.location.reload();
    });
  });
}
