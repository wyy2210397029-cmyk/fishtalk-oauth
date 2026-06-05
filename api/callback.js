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
      res.writeHead(400);
      res.end(`Auth Error: ${data.error_description || data.error}`);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<!DOCTYPE html>
<html>
<head><title>Auth Complete</title></head>
<body>
<script>
  (function() {
    window.opener.postMessage(
      { token: "${data.access_token}", provider: "github" },
      "*"
    );
  })();
</script>
<p>Authorization successful! Closing window...</p>
</body>
</html>`);
  } catch (err) {
    res.writeHead(500);
    res.end("OAuth Error: " + err.message);
  }
}
