import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile Widget Component
 * Dynamically loads Turnstile if VITE_TURNSTILE_SITE_KEY is configured.
 * Safely renders nothing if VITE_TURNSTILE_SITE_KEY is not set (local dev mode).
 */
export default function TurnstileWidget({ action, onVerify, onExpire, onError, resetTrigger }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // Preserve callback references to prevent widget re-creation on parent keystrokes
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  });

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let isMounted = true;

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;
      try {
        if (widgetIdRef.current !== null) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore removal error
          }
          widgetIdRef.current = null;
        }

        const renderOptions = {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => {
            if (isMounted && callbacksRef.current.onVerify) {
              callbacksRef.current.onVerify(token);
            }
          },
          "expired-callback": () => {
            if (isMounted) {
              if (callbacksRef.current.onExpire) callbacksRef.current.onExpire();
              if (widgetIdRef.current !== null) {
                try {
                  window.turnstile.reset(widgetIdRef.current);
                } catch {
                  // ignore reset error
                }
              }
            }
          },
          "error-callback": () => {
            if (isMounted) {
              if (callbacksRef.current.onError) callbacksRef.current.onError();
              if (widgetIdRef.current !== null) {
                try {
                  window.turnstile.reset(widgetIdRef.current);
                } catch {
                  // ignore reset error
                }
              }
            }
          },
        };

        if (action) {
          renderOptions.action = action;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, renderOptions);
      } catch (err) {
        console.warn("[TURNSTILE] Render error:", err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.getElementById("cloudflare-turnstile-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "cloudflare-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", renderWidget);
      }
    }

    return () => {
      isMounted = false;
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [siteKey, action]);

  // Reset widget when resetTrigger changes
  useEffect(() => {
    if (window.turnstile && widgetIdRef.current !== null && resetTrigger) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch (err) {
        console.warn("[TURNSTILE] Reset error:", err);
      }
    }
  }, [resetTrigger]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className="flex justify-center my-3">
      <div
        ref={containerRef}
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-action={action}
      />
    </div>
  );
}
