// adminTest.js
// Pure logic functions for admin unit tests (no DOM, no Supabase)

function formatUserRow(user) {
  return {
    username: user.username,
    email: user.email,
    role: user.role,
    is_active: user.is_active ? "Active" : "Inactive",
  };
}

function canPromoteToSeller(user) {
  return user.role === "buyer";
}

function filterActiveUsers(users) {
  return users.filter(u => u.is_active);
}

module.exports = {
  formatUserRow,
  canPromoteToSeller,
  filterActiveUsers,
};
