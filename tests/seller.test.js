const {
  formatProductRow,
  getTopSellingProduct,
  filterOrdersByStatus,
} = require("../websitePages/sellerPages/sellerTest");

describe("Seller Logic Tests", () => {
  test("formats a product row correctly", () => {
    const product = {
      id: 1,
      name: "Frog Sticker",
      price: 4.5,
      quantity_available: 12,
      categoryName: "Stickers",
    };

    const row = formatProductRow(product);

    expect(row).toEqual({
      name: "Frog Sticker",
      category: "Stickers",
      priceLabel: "$4.50",
      quantity_available: 12,
    });
  });

  test("finds the top selling product from order items", () => {
    const products = [
      { id: 1, name: "Frog Sticker" },
      { id: 2, name: "Cat Sticker" },
      { id: 3, name: "Bird Sticker" },
    ];

    const orderItems = [
      { product_id: 1, quantity: 2 },
      { product_id: 2, quantity: 5 },
      { product_id: 1, quantity: 1 },
      { product_id: 3, quantity: 3 },
    ];

    const top = getTopSellingProduct(orderItems, products);
    expect(top).toBe("Cat Sticker"); // 5 is the highest quantity
  });

  test("filters orders by status (and supports 'all')", () => {
    const orders = [
      { id: "a", status: "paid" },
      { id: "b", status: "shipped" },
      { id: "c", status: "paid" },
    ];

    const all = filterOrdersByStatus(orders, "all");
    const paid = filterOrdersByStatus(orders, "paid");
    const shipped = filterOrdersByStatus(orders, "shipped");

    expect(all).toHaveLength(3);
    expect(paid.map(o => o.id)).toEqual(["a", "c"]);
    expect(shipped.map(o => o.id)).toEqual(["b"]);
  });
});
