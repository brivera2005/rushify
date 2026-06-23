const base = process.argv[2] ?? "http://127.0.0.1:3000";

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
});
const setCookie = login.headers.get("set-cookie") ?? "";
const match = setCookie.match(/rushify_session=([^;]+)/);
if (!match) {
  console.error("login failed", login.status, await login.text());
  process.exit(1);
}
const cookie = `rushify_session=${match[1]}`;

const getBefore = await fetch(`${base}/api/user/prefs`, { headers: { Cookie: cookie } });
console.log("GET before", getBefore.status, await getBefore.json());

const post = await fetch(`${base}/api/user/prefs`, {
  method: "POST",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({ hiddenCategories: ["Sports"] }),
});
const postBody = await post.json();
console.log("POST", post.status, postBody);

const getAfter = await fetch(`${base}/api/user/prefs`, { headers: { Cookie: cookie } });
const getAfterBody = await getAfter.json();
console.log("GET after", getAfter.status, getAfterBody);

if (!Array.isArray(getAfterBody.hiddenCategories) || !getAfterBody.hiddenCategories.includes("Sports")) {
  console.error("FAIL: hiddenCategories not persisted");
  process.exit(1);
}
console.log("OK: prefs persisted");
