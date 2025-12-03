// sellerTest.js
// Pure logic helpers for seller unit tests (no DOM, no Supabase)

/**
 * Formats a product for display in the seller table.
 */
function formatProductRow(product) {
  return {
    name: product.name,
    category: product.categoryName || "N/A",
    priceLabel: `$${product.price.toFixed(2)}`,
    quantity_available: product.quantity_available,
  };
}

/**
 * Given order items and products, returns the name of the top-selling product
 * (by total quantity sold). Returns "N/A" if no items.
 */
function getTopSellingProduct(orderItems, products) {
  if (!orderItems.length) return "N/A";

  const totals = {};
  orderItems.forEach((item) => {
    totals[item.product_id] =
      (totals[item.product_id] || 0) + (item.quantity || 0);
  });

  let bestId = null;
  let bestQty = -1;
  for (const [productId, qty] of Object.entries(totals)) {
    if (qty > bestQty) {
      bestQty = qty;
      bestId = productId;
    }
  }

  const found = products.find((p) => String(p.id) === String(bestId));
  return found ? found.name : "N/A";
}

/**
 * Filters orders by status (similar to the filter buttons in orders.js).
 * status = "all" returns all; otherwise matches normalized status.
 */
function filterOrdersByStatus(orders, status) {
  if (status === "all") return orders;

  const normalized = status.toLowerCase();
  return orders.filter(
    (o) => (o.status || "").toLowerCase() === normalized
  );
}

module.exports = {
  formatProductRow,
  getTopSellingProduct,
  filterOrdersByStatus,
};
