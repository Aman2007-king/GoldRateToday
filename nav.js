/* nav.js — shared navigation logic */
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('dbg').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('dbg').classList.remove('show');
  document.body.style.overflow = '';
}
