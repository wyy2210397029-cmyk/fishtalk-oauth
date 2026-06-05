export default async function handler(req, res) {
  const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URL } =
    process.env;
  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const code = req.query.code;

  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: OAUTH_CLIENT_ID,
          client_secret: OAUTH_CLIENT_SECRET,
          code,
          redirect_uri: OAUTH_REDIRECT_URL || `${baseUrl}/api/callback`,
        }),
      }
    );

    const data = await tokenResponse.json();

    if (data.error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(renderCallbackPage({
        status: "error",
        error: data.error_description || data.error,
      }));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderCallbackPage({ status: "success", token: data.access_token }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end(renderCallbackPage({ status: "error", error: err.message }));
  }
}

function renderCallbackPage(result) {
  const payload =
    result.status === "success"
      ? {
          token: result.token,
          provider: "github",
        }
      : {
          error: result.error || "OAuth failed",
          provider: "github",
        };
  const message =
    result.status === "success"
      ? `authorization:github:success:${JSON.stringify(payload)}`
      : `authorization:github:error:${JSON.stringify(payload)}`;
  const title = result.status === "success" ? "Auth Complete" : "Auth Error";
  const bodyText =
    result.status === "success"
      ? "Authorization successful. You can close this window if it does not close automatically."
      : `Authorization failed: ${payload.error}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
<script>
  (function() {
    var message = ${JSON.stringify(message)};
    var opener = window.opener;

    function sendAuthMessage() {
      if (!opener) return;
      opener.postMessage("authorizing:github", "*");
      opener.postMessage(message, "*");
    }

    window.addEventListener("message", function(event) {
      if (event.data === "authorizing:github") {
        opener = event.source || opener;
        opener.postMessage(message, event.origin || "*");
        window.close();
      }
    });

    sendAuthMessage();
    setTimeout(sendAuthMessage, 500);
    setTimeout(function() {
      window.close();
    }, 1000);
  })();
</script>
<p>${escapeHtml(bodyText)}</p>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
