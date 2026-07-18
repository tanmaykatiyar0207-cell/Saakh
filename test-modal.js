const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('c:/Saakh/index.html', 'utf8');
const authJs = fs.readFileSync('c:/Saakh/auth.js', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });

dom.window.supabase = {
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => {}
    }
  })
};

dom.window.eval('window.SAAKH_SUPABASE = {url: "http://test", anonKey: "test"};');
dom.window.eval(authJs);

const btn = dom.window.document.getElementById('nav-login-btn');
if (btn) {
  console.log("Clicking button");
  btn.click();
  setTimeout(() => {
    const modal = dom.window.document.getElementById('auth-modal');
    console.log('display:', modal.style.display, 'classes:', modal.className);
  }, 50);
} else {
  console.log("Button not found");
}
 