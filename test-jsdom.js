const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const authJs = fs.readFileSync(path.join(__dirname, "auth.js"), "utf8");
const supabaseConfigJs = fs.readFileSync(path.join(__dirname, "supabase-config.js"), "utf8");

const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

// Mock supabase
dom.window.supabase = {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => {},
    }
  })
};

// Evaluate scripts
try {
  dom.window.eval(supabaseConfigJs);
  dom.window.eval(authJs);
  console.log("auth.js executed successfully.");
  
  // click login button
  const loginBtn = dom.window.document.getElementById('nav-login-btn');
  if (loginBtn) {
    loginBtn.click();
    const modal = dom.window.document.getElementById('auth-modal');
    console.log("Modal display style after click:", modal.style.display);
  } else {
    console.log("nav-login-btn NOT FOUND");
  }

} catch (err) {
  console.error("Error executing script:", err);
}
 