async function requireAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    if (!location.pathname.endsWith("/login.html")) {
      location.href = "login.html";
    }
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("id,name,email,role,active")
    .eq("id", session.user.id)
    .single();

  if (error || !profile || profile.role !== "ADMIN" || !profile.active) {
    await supabaseClient.auth.signOut();
    alert("Admin access required.");
    location.href = "login.html";
    return null;
  }

  return profile;
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.href = "login.html";
}

if (!location.pathname.endsWith("/login.html")) {
  requireAdmin();
  const sidebar = document.querySelector('.sidebar');
  if (sidebar && !document.getElementById('adminMenuToggle')) {
    const menu = document.createElement('button');
    menu.id = 'adminMenuToggle';
    menu.className = 'menu-toggle';
    menu.type = 'button';
    menu.setAttribute('aria-label', 'Toggle navigation menu');
    menu.textContent = 'Menu';
    document.body.append(menu);
    menu.addEventListener('click', () => sidebar.classList.toggle('menu-open'));
  }
  if (/\/(announcements|emails)\.html$/.test(location.pathname)) {
    const filterScript = document.createElement('script');
    filterScript.src = '../js/recipient-filters.js';
    document.body.append(filterScript);
  }
}

document.getElementById("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.getElementById("message");
  message.textContent = "Signing in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  });

  if (error) {
    message.className = "error";
    message.textContent = error.message;
    return;
  }

  const profile = await requireAdmin();
  if (profile) location.href = "dashboard.html";
});
