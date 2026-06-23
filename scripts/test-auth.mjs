fetch("http://127.0.0.1:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin" }),
})
  .then(async (response) => {
    const setCookie = response.headers.get("set-cookie") ?? "";
    const body = await response.json();
    console.log("login", response.status, body);
    const match = setCookie.match(/rushify_session=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    const me = await fetch("http://127.0.0.1:3000/api/auth/me", {
      headers: { Cookie: `rushify_session=${raw}` },
    });
    console.log("me", me.status, await me.json());
    const home = await fetch("http://127.0.0.1:3000/", {
      headers: { Cookie: `rushify_session=${raw}` },
      redirect: "manual",
    });
    console.log("home", home.status, home.headers.get("location"));
  })
  .catch(console.error);
