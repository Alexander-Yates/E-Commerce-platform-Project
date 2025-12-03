const {
  formatUserRow,
  canPromoteToSeller,
  filterActiveUsers,
} = require("../websitePages/adminPages/adminTest");

describe("Admin Logic Tests", () => {
  test("formats a user row correctly", () => {
    const user = {
      username: "hayden",
      email: "hayden@example.com",
      role: "seller",
      is_active: true,
    };

    const row = formatUserRow(user);

    expect(row).toEqual({
      username: "hayden",
      email: "hayden@example.com",
      role: "seller",
      is_active: "Active",
    });
  });

  test("determines if a buyer can be promoted to seller", () => {
    expect(canPromoteToSeller({ role: "buyer" })).toBe(true);
    expect(canPromoteToSeller({ role: "seller" })).toBe(false);
  });

  test("filters only active users", () => {
    const users = [
      { username: "a", is_active: true },
      { username: "b", is_active: false },
      { username: "c", is_active: true },
    ];

    const result = filterActiveUsers(users);

    expect(result.length).toBe(2);
    expect(result.map(u => u.username)).toEqual(["a", "c"]);
  });
});
