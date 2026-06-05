export default function handler(req, res) {
  const { OAUTH_CLIENT_ID, OAUTH_REDIRECT_URL } = process.env;
  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const baseUrl = `${proto}://${host}`;

  const redirectUri = OAUTH_REDIRECT_URL || `${baseUrl}/api/callback`;

  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "repo,user",
  });

  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params}`,
  });
  res.end();
}
